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

    # Dynamic Lap-to-Lap comparison for advisory message (Task 4)
    if n >= 2:
        curr_lap = laps[-1]
        prev_lap = laps[-2]
        
        curr_stress = float(curr_lap.get("stress_score", curr_lap.get("stress", 0.0)))
        prev_stress = float(prev_lap.get("stress_score", prev_lap.get("stress", 0.0)))
        
        try:
            curr_time = parse_lap_time_to_seconds(curr_lap.get("lap_time_seconds", curr_lap.get("lapTime", curr_lap.get("lap_time_str", "0.0"))))
            prev_time = parse_lap_time_to_seconds(prev_lap.get("lap_time_seconds", prev_lap.get("lapTime", prev_lap.get("lap_time_str", "0.0"))))
        except ValueError:
            curr_time = 0.0
            prev_time = 0.0
            
        stress_diff = curr_stress - prev_stress
        time_diff = curr_time - prev_time
        prev_lap_num = prev_lap.get("lap_number", prev_lap.get("lap", n - 1))
        
        if stress_diff >= 0:
            stress_text = f"Stress rose from {int(prev_stress)}% to {int(curr_stress)}%"
        else:
            stress_text = f"Stress decreased from {int(prev_stress)}% to {int(curr_stress)}%"
            
        if time_diff >= 0:
            time_text = f"lap time worsened by {time_diff:.2f}s versus Lap {prev_lap_num}"
        else:
            time_text = f"lap time improved by {abs(time_diff):.2f}s versus Lap {prev_lap_num}"
            
        if curr_stress > 60:
            recommendation = "Pit intervention recommended."
        else:
            recommendation = "Maintain current stint strategy."
            
        advisory = f"{stress_text}; {time_text}. {recommendation}"
    else:
        advisory = f"Driver stress is optimal (avg {avg_stress}%). Pace is consistent across all logged laps. Maintain current stint strategy."

    return {
        "correlation_coefficient": correlation,
        "average_stress": avg_stress,
        "advisory_message": advisory
    }
