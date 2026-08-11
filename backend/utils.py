import os
import json
import math
import tempfile

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "session_db.json")


def parse_lap_time_to_seconds(lap_time_val) -> float:
    """
    Parses a lap time string or float into float seconds.
    Supported formats:
      - "1:21.400" -> 81.4
      - "01:22.500" -> 82.5
      - "1:22" -> 82.0
      - "82.50" -> 82.5
      - 82.5 (float) -> 82.5
    """
    if isinstance(lap_time_val, (int, float)):
        return round(float(lap_time_val), 3)

    if not isinstance(lap_time_val, str):
        try:
            return round(float(lap_time_val), 3)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid lap time value: {lap_time_val}")

    cleaned_str = lap_time_val.strip().replace(",", ".")

    if ":" in cleaned_str:
        parts = cleaned_str.split(":")
        if len(parts) == 2:
            minutes = float(parts[0])
            seconds = float(parts[1])
            total_seconds = minutes * 60.0 + seconds
            return round(total_seconds, 3)
        elif len(parts) == 3:
            hours = float(parts[0])
            minutes = float(parts[1])
            seconds = float(parts[2])
            total_seconds = hours * 3600.0 + minutes * 60.0 + seconds
            return round(total_seconds, 3)
        else:
            raise ValueError(f"Cannot parse lap time format: {lap_time_val}")
    else:
        total_seconds = float(cleaned_str)
        return round(total_seconds, 3)


def read_session_db(db_path: str = DEFAULT_DB_PATH) -> list:
    """Reads all lap records from the local JSON database file safely."""
    if not os.path.exists(db_path):
        return []
    try:
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except (json.JSONDecodeError, OSError):
        return []


def write_session_db(data: list, db_path: str = DEFAULT_DB_PATH) -> None:
    """Writes lap records to the local JSON database file using an atomic write."""
    db_dir = os.path.dirname(os.path.abspath(db_path))
    os.makedirs(db_dir, exist_ok=True)
    
    fd, temp_file_path = tempfile.mkstemp(dir=db_dir, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp_file_path, db_path)
    except Exception:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise


def calculate_insights(laps: list) -> dict:
    """
    Analyzes session history to calculate:
      - average_stress (float)
      - correlation_coefficient (float: Pearson r between stress_score & lap_time_seconds)
      - advisory_message (string: strategic recommendations comparing stress > 60% vs stress < 40% or normal)
    """
    if not laps:
        return {
            "correlation_coefficient": 0.0,
            "average_stress": 0.0,
            "advisory_message": "No session telemetry logged yet. Begin stints to gather analytics."
        }

    # Normalize fields across different frontend/backend schemas
    normalized_laps = []
    for l in laps:
        stress = float(l.get("stress_score", l.get("stress", 0.0)))
        
        raw_time = l.get("lap_time_seconds", l.get("lapTime", l.get("lap_time_str", "0.0")))
        try:
            time_sec = parse_lap_time_to_seconds(raw_time)
        except ValueError:
            time_sec = 0.0

        normalized_laps.append({"stress": stress, "time": time_sec})

    stress_scores = [l["stress"] for l in normalized_laps]
    lap_times = [l["time"] for l in normalized_laps]

    n = len(normalized_laps)
    avg_stress = sum(stress_scores) / n

    # Pearson correlation coefficient
    if n < 2:
        correlation = 0.0
    else:
        mean_x = sum(stress_scores) / n
        mean_y = sum(lap_times) / n
        
        var_x = sum((x - mean_x) ** 2 for x in stress_scores)
        var_y = sum((y - mean_y) ** 2 for y in lap_times)
        
        if var_x == 0 or var_y == 0:
            correlation = 0.0
        else:
            cov_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(stress_scores, lap_times))
            correlation = cov_xy / math.sqrt(var_x * var_y)

    correlation = round(float(correlation), 2)
    avg_stress = round(float(avg_stress), 1)

    # Compare average lap times when stress > 60% vs when stress < 40% (or normal)
    high_stress_times = [l["time"] for l in normalized_laps if l["stress"] > 60.0]
    low_stress_times = [l["time"] for l in normalized_laps if l["stress"] < 40.0]
    normal_stress_times = [l["time"] for l in normalized_laps if l["stress"] <= 60.0]

    if high_stress_times:
        avg_high = sum(high_stress_times) / len(high_stress_times)
        baseline_times = low_stress_times if low_stress_times else normal_stress_times
        
        if baseline_times:
            avg_baseline = sum(baseline_times) / len(baseline_times)
            delta = avg_high - avg_baseline
            if delta > 0:
                advisory = (
                    f"On laps with stress exceeding 60%, lap times dropped by {delta:.1f} seconds on average. "
                    f"Pit intervention recommended."
                )
            else:
                advisory = (
                    f"High stress (>60%) detected on {len(high_stress_times)} lap(s), but pace remains steady. "
                    f"Monitor driver radio closely."
                )
        else:
            advisory = (
                f"Critical driver stress sustained (avg {avg_stress}%). "
                f"Immediate pit stop and driver reassurance suggested."
            )
    elif avg_stress > 45.0:
        advisory = (
            f"Moderate cumulative stress detected (avg {avg_stress}%). "
            f"Prepare pit crew for upcoming tire swap window."
        )
    else:
        advisory = (
            f"Driver stress is optimal (avg {avg_stress}%). "
            f"Pace is consistent across all logged laps. Maintain current stint strategy."
        )

    return {
        "correlation_coefficient": correlation,
        "average_stress": avg_stress,
        "advisory_message": advisory
    }
