import os
import glob
import io
import torch
import soundfile as sf
import librosa
import numpy as np
from datasets import Dataset, Audio
from transformers import (
    WhisperProcessor,
    WhisperForConditionalGeneration,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
)
from peft import LoraConfig, get_peft_model
from dataclasses import dataclass
from typing import Any, Dict, List, Union

DATA_DIR = r"C:\Users\vidhy\Desktop\Hackathons\data"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "models", "whisper-f1")
MODEL_ID = "openai/whisper-medium"

def load_f1_dataset():
    print("Loading Parquet files from:", DATA_DIR)
    parquet_files = sorted(glob.glob(os.path.join(DATA_DIR, "train-*.parquet")))
    if not parquet_files:
        raise FileNotFoundError(f"No parquet files found in {DATA_DIR}")
    
    print(f"Found {len(parquet_files)} dataset files.")
    ds = Dataset.from_parquet(parquet_files)
    ds = ds.cast_column("audio", Audio(decode=False))
    
    # Filter out empty/null transcripts
    ds = ds.filter(lambda x: x["transcription"] is not None and len(str(x["transcription"]).strip()) > 0)
    print(f"Total valid samples: {len(ds)}")
    return ds


def prepare_audio_features(batch, processor):
    audio_entry = batch["audio"]
    audio_bytes = audio_entry.get("bytes") if isinstance(audio_entry, dict) else None
    
    if audio_bytes:
        try:
            audio_array, sampling_rate = sf.read(io.BytesIO(audio_bytes))
            if len(audio_array.shape) > 1:
                audio_array = np.mean(audio_array, axis=1)
            if sampling_rate != 16000:
                audio_array = librosa.resample(audio_array, orig_sr=sampling_rate, target_sr=16000)
        except Exception:
            audio_array = np.zeros(16000, dtype=np.float32)
    else:
        audio_array = np.zeros(16000, dtype=np.float32)

    input_features = processor.feature_extractor(
        audio_array, sampling_rate=16000
    ).input_features[0]

    labels = processor.tokenizer(str(batch["transcription"]), truncation=True, max_length=448).input_ids

    return {
        "input_features": input_features,
        "labels": labels
    }


@dataclass
class DataCollatorSpeechSeq2SeqWithPadding:
    processor: Any

    def __call__(self, features: List[Dict[str, Union[List[int], torch.Tensor]]]) -> Dict[str, torch.Tensor]:
        input_features = [{"input_features": feature["input_features"]} for feature in features]
        batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")

        label_features = [{"input_ids": feature["labels"]} for feature in features]
        labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")

        labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)

        # Cut BOS token if present
        if (labels[:, 0] == self.processor.tokenizer.bos_token_id).all().cpu().item():
            labels = labels[:, 1:]

        batch["labels"] = labels
        return batch


def main():
    print("=" * 60)
    print("      F1 Team Radio - Whisper Medium LoRA Fine-Tuning")
    print("=" * 60)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using compute device: {device}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM Available: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

    # 1. Load Dataset
    raw_dataset = load_f1_dataset()
    
    # 2. Load Whisper Processor & Model
    print("Loading base Whisper Medium model:", MODEL_ID)
    processor = WhisperProcessor.from_pretrained(MODEL_ID, language="english", task="transcribe")
    model = WhisperForConditionalGeneration.from_pretrained(MODEL_ID)
    
    # Configure generation
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []
    model.config.use_cache = False  # Gradient checkpointing compatibility

    # 3. Apply LoRA
    print("Configuring LoRA adapters...")
    lora_config = LoraConfig(
        r=32,
        lora_alpha=64,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 4. Map dataset
    print("Preprocessing audio dataset into Whisper features...")
    processed_dataset = raw_dataset.map(
        lambda batch: prepare_audio_features(batch, processor),
        remove_columns=raw_dataset.column_names,
        num_proc=1,
        desc="Extracting audio features"
    )

    data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)

    # 5. Training Arguments
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    training_args = Seq2SeqTrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=1e-3,
        warmup_steps=300,
        num_train_epochs=3,
        gradient_checkpointing=True,
        fp16=torch.cuda.is_available(),
        per_device_eval_batch_size=4,
        predict_with_generate=True,
        generation_max_length=225,
        save_steps=500,
        logging_steps=25,
        report_to=["none"],
        load_best_model_at_end=False,
        metric_for_best_model="loss",
        greater_is_better=False,
        push_to_hub=False,
    )

    # 6. Trainer
    trainer = Seq2SeqTrainer(
        args=training_args,
        model=model,
        train_dataset=processed_dataset,
        data_collator=data_collator,
        processing_class=processor.feature_extractor,
    )

    print("\nStarting LoRA Fine-Tuning on F1 Radio Data...")
    trainer.train()

    print("\nSaving fine-tuned Whisper-F1 model to:", OUTPUT_DIR)
    model.save_pretrained(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)
    print("Fine-tuning complete!")

if __name__ == "__main__":
    main()
