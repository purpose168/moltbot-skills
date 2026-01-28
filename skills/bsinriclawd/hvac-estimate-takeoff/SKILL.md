name: hvac_estimate_takeoff
description: 从 PDF 平面图中提取 HVAC 估算数据（设备数量和日程表）
trigger: file_upload
file_types: [pdf]
tools:
  - pymupdf-pdf
output: table
