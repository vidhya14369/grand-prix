import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app
from utils import parse_lap_time_to_seconds, calculate_insights, read_session_db, write_session_db

client = TestClient(app)

class TestBackendMember2(unittest.TestCase):

    def setUp(self):
        # Reset session DB to default state before each test
        response = client.delete("/api/session/reset")
        self.assertEqual(response.status_code, 200)

    def test_lap_time_parsing(self):
        """Test time parsing logic converting strings to float seconds."""
        self.assertEqual(parse_lap_time_to_seconds("1:21.400"), 81.400)
        self.assertEqual(parse_lap_time_to_seconds("01:22.500"), 82.500)
        self.assertEqual(parse_lap_time_to_seconds("1:22"), 82.000)
        self.assertEqual(parse_lap_time_to_seconds("82.50"), 82.500)
        self.assertEqual(parse_lap_time_to_seconds("1:21,400"), 81.400)
        self.assertEqual(parse_lap_time_to_seconds(82.5), 82.500)

        with self.assertRaises(ValueError):
            parse_lap_time_to_seconds("invalid_time_string")

    def test_get_session(self):
        """Test retrieving all logged laps in the session."""
        response = client.get("/api/session")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 5)

    def test_add_lap(self):
        """Test adding a new lap and automatically parsing lap_time_str into lap_time_seconds."""
        new_lap = {
            "lap_number": 6,
            "lap_time_str": "1:25.500",
            "transcript": "Engine overheating, losing speed on straight!",
            "stress_score": 92.0,
            "detected_emotion": "Stressed"
        }
        response = client.post("/api/session/add", json=new_lap)
        self.assertEqual(response.status_code, 201)
        added_data = response.json()
        self.assertEqual(added_data["lap_number"], 6)
        self.assertEqual(added_data["lap_time_seconds"], 85.500)

        # Verify it persisted in DB
        session_resp = client.get("/api/session")
        all_laps = session_resp.json()
        self.assertEqual(len(all_laps), 6)

    def test_get_insights(self):
        """Test calculating stress > 60% lap time comparison, correlation, and advisory recommendations."""
        response = client.get("/api/session/insights")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("correlation_coefficient", data)
        self.assertIn("average_stress", data)
        self.assertIn("advisory_message", data)
        
        self.assertIsInstance(data["correlation_coefficient"], float)
        self.assertIsInstance(data["average_stress"], float)
        self.assertIsInstance(data["advisory_message"], str)
        self.assertIn("versus Lap 4. Pit intervention recommended", data["advisory_message"])

    def test_calculate_insights_custom_laps(self):
        """Test calculate_insights function with two known laps, asserting exact stress and pace deltas."""
        test_laps = [
            {
                "lap_number": 7,
                "lap": 7,
                "lap_time_seconds": 82.372,
                "lapTime": 82.372,
                "stress_score": 61.0,
                "stress": 61.0,
                "detected_emotion": "Tired",
                "mood": "tired",
                "transcript": "Checking rears"
            },
            {
                "lap_number": 8,
                "lap": 8,
                "lap_time_seconds": 82.918,
                "lapTime": 82.918,
                "stress_score": 74.0,
                "stress": 74.0,
                "detected_emotion": "Stressed",
                "mood": "stressed",
                "transcript": "Tires are gone!"
            }
        ]
        res = calculate_insights(test_laps)
        expected_msg = "Stress rose from 61% to 74%; lap time worsened by 0.55s versus Lap 7. Pit intervention recommended."
        self.assertEqual(res["advisory_message"], expected_msg)

    def test_static_presets_serving(self):
        """Test serving static F1 radio preset audio files."""
        for preset in ["calm.wav", "tired.wav", "stressed.wav"]:
            response = client.get(f"/presets/{preset}")
            self.assertEqual(response.status_code, 200, f"Preset {preset} failed to serve")
            self.assertIn("audio/", response.headers.get("content-type", ""))

if __name__ == "__main__":
    unittest.main()
