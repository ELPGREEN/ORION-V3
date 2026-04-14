#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════
 ORION Tire Production Line — Custom ROS2 Services & Actions
 
 Deploy on robot:
   ros2 run orion_tire_services tire_line_node
 
 Or as standalone:
   python3 tire_line_services.py
═══════════════════════════════════════════════════════════
"""

import rclpy
from rclpy.node import Node
from rclpy.action import ActionServer
from rclpy.callback_groups import ReentrantCallbackGroup

from std_srvs.srv import Trigger, SetBool
from std_msgs.msg import String, Float32, Bool
from geometry_msgs.msg import PoseStamped
from sensor_msgs.msg import Image, BatteryState

import json
import time
import random


class TireLineNode(Node):
    """
    Main node for tire production line robotics.
    
    Services exposed:
      /tire_line/start_inspection    — Trigger tire visual inspection
      /tire_line/set_conveyor        — SetBool to start/stop conveyor belt
      /tire_line/get_line_status     — Trigger returns JSON with line status
      /tire_line/calibrate_camera    — Trigger camera calibration
      /tire_line/emergency_stop      — Trigger e-stop for entire line
      /tire_line/reset_counters      — Reset production counters
    
    Topics published:
      /tire_line/production_stats    — JSON with OEE, count, defects
      /tire_line/defect_alert        — Real-time defect notifications
      /tire_line/conveyor_speed      — Current conveyor speed (m/s)
    
    Topics subscribed:
      /tire_line/inspection_result   — Results from YOLOv8 vision node
    """

    def __init__(self):
        super().__init__("orion_tire_line")
        self.get_logger().info("🏭 ORION Tire Line Node starting...")

        self.cbg = ReentrantCallbackGroup()

        # ─── State ───
        self.conveyor_running = False
        self.conveyor_speed = 0.0  # m/s
        self.tire_count = 0
        self.defect_count = 0
        self.good_count = 0
        self.line_start_time = time.time()
        self.emergency_stopped = False
        self.last_inspection_result = None

        # ─── Services ───
        self.create_service(Trigger, "/tire_line/start_inspection", self.cb_start_inspection, callback_group=self.cbg)
        self.create_service(SetBool, "/tire_line/set_conveyor", self.cb_set_conveyor, callback_group=self.cbg)
        self.create_service(Trigger, "/tire_line/get_line_status", self.cb_get_line_status, callback_group=self.cbg)
        self.create_service(Trigger, "/tire_line/calibrate_camera", self.cb_calibrate_camera, callback_group=self.cbg)
        self.create_service(Trigger, "/tire_line/emergency_stop", self.cb_emergency_stop, callback_group=self.cbg)
        self.create_service(Trigger, "/tire_line/reset_counters", self.cb_reset_counters, callback_group=self.cbg)

        # ─── Publishers ───
        self.pub_stats = self.create_publisher(String, "/tire_line/production_stats", 10)
        self.pub_defect = self.create_publisher(String, "/tire_line/defect_alert", 10)
        self.pub_conveyor_speed = self.create_publisher(Float32, "/tire_line/conveyor_speed", 10)

        # ─── Subscribers ───
        self.create_subscription(String, "/tire_line/inspection_result", self.cb_inspection_result, 10, callback_group=self.cbg)

        # ─── Timers ───
        self.create_timer(5.0, self.publish_production_stats)
        self.create_timer(1.0, self.publish_conveyor_speed)

        self.get_logger().info("🏭 ORION Tire Line Node ready — all services active")

    # ═══════════════════ Service Callbacks ═══════════════════

    def cb_start_inspection(self, request, response):
        """Trigger a tire inspection cycle."""
        if self.emergency_stopped:
            response.success = False
            response.message = "Line is in emergency stop"
            return response

        self.tire_count += 1
        # In production, this would trigger the camera + YOLOv8 pipeline
        # For now, simulate an inspection result
        is_defective = random.random() < 0.08  # 8% defect rate
        if is_defective:
            self.defect_count += 1
            defect_type = random.choice(["bubble", "cut", "delamination", "uneven_tread", "sidewall_crack"])
            alert = json.dumps({
                "tire_id": self.tire_count,
                "defect": defect_type,
                "confidence": round(random.uniform(0.85, 0.99), 3),
                "timestamp": time.time(),
                "action": "reject"
            })
            msg = String()
            msg.data = alert
            self.pub_defect.publish(msg)
            response.message = f"DEFECT DETECTED: {defect_type} on tire #{self.tire_count}"
        else:
            self.good_count += 1
            response.message = f"Tire #{self.tire_count} PASSED inspection"

        response.success = True
        self.get_logger().info(response.message)
        return response

    def cb_set_conveyor(self, request, response):
        """Start or stop the conveyor belt."""
        if self.emergency_stopped and request.data:
            response.success = False
            response.message = "Cannot start conveyor during emergency stop"
            return response

        self.conveyor_running = request.data
        self.conveyor_speed = 0.5 if request.data else 0.0  # 0.5 m/s default
        response.success = True
        response.message = f"Conveyor {'STARTED' if request.data else 'STOPPED'}"
        self.get_logger().info(response.message)
        return response

    def cb_get_line_status(self, request, response):
        """Return comprehensive line status as JSON."""
        uptime = max(time.time() - self.line_start_time, 0.1) # Minimum 100ms
        oee = self._calculate_oee()
        status = {
            "conveyor_running": self.conveyor_running,
            "conveyor_speed_mps": self.conveyor_speed,
            "emergency_stopped": self.emergency_stopped,
            "tire_count": self.tire_count,
            "good_count": self.good_count,
            "defect_count": self.defect_count,
            "defect_rate_pct": round((self.defect_count / max(self.tire_count, 1)) * 100, 2),
            "oee_pct": round(oee * 100, 2),
            "uptime_seconds": round(uptime, 1),
            "uptime_hours": round(uptime / 3600, 4),
            "throughput_per_hour": round(self.tire_count / max(uptime / 3600, 0.0001), 1),
            "last_inspection": self.last_inspection_result,
        }
        response.success = True
        response.message = json.dumps(status)
        return response

    def cb_calibrate_camera(self, request, response):
        """Trigger camera calibration sequence."""
        self.get_logger().info("📷 Starting camera calibration...")
        # In production: call OpenCV calibration routine
        time.sleep(0.5)  # Simulate calibration
        response.success = True
        response.message = "Camera calibrated successfully. Reprojection error: 0.32px"
        return response

    def cb_emergency_stop(self, request, response):
        """Emergency stop entire production line."""
        self.emergency_stopped = True
        self.conveyor_running = False
        self.conveyor_speed = 0.0
        self.get_logger().error("🚨 EMERGENCY STOP ACTIVATED")
        response.success = True
        response.message = "EMERGENCY STOP — all systems halted"
        return response

    def cb_reset_counters(self, request, response):
        """Reset production counters."""
        self.tire_count = 0
        self.defect_count = 0
        self.good_count = 0
        self.line_start_time = time.time()
        response.success = True
        response.message = "Production counters reset"
        return response

    # ═══════════════════ Subscription Callbacks ═══════════════════

    def cb_inspection_result(self, msg):
        """Handle inspection results from YOLOv8 vision node."""
        try:
            self.last_inspection_result = json.loads(msg.data)
            self.get_logger().info(f"Inspection result received: {msg.data[:100]}")
        except json.JSONDecodeError:
            self.get_logger().warn("Invalid inspection result JSON")

    # ═══════════════════ Publishers ═══════════════════

    def publish_production_stats(self):
        """Publish production statistics every 5s."""
        uptime = max(time.time() - self.line_start_time, 0.1)
        stats = {
            "tire_count": self.tire_count,
            "good_count": self.good_count,
            "defect_count": self.defect_count,
            "oee_pct": round(self._calculate_oee() * 100, 2),
            "throughput_per_hour": round(self.tire_count / max(uptime / 3600, 0.0001), 1),
            "conveyor_running": self.conveyor_running,
            "timestamp": time.time(),
        }
        msg = String()
        msg.data = json.dumps(stats)
        self.pub_stats.publish(msg)

    def publish_conveyor_speed(self):
        """Publish conveyor speed every 1s."""
        msg = Float32()
        msg.data = self.conveyor_speed
        self.pub_conveyor_speed.publish(msg)

    # ═══════════════════ Helpers ═══════════════════

    def _calculate_oee(self):
        """Calculate Overall Equipment Effectiveness."""
        if self.tire_count <= 0:
            return 0.0

        # Availability: Ratio of actual operating time to planned time
        # Here we simplify: if conveyor is running, it's 1.0
        availability = 1.0 if self.conveyor_running else 0.0

        # Performance: Actual output vs design capacity (120 tires/hour)
        uptime_hours = (time.time() - self.line_start_time) / 3600
        design_capacity = max(uptime_hours * 120, 0.0001)
        performance = min(self.tire_count / design_capacity, 1.0)

        # Quality: Good parts vs total parts
        quality = self.good_count / max(self.tire_count, 1)

        # OEE = A * P * Q
        return max(0.0, min(availability * performance * quality, 1.0))


def main():
    rclpy.init()
    node = TireLineNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        node.get_logger().info("Shutting down Tire Line Node")
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
