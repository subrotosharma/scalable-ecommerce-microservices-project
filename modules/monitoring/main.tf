resource "aws_cloudwatch_log_group" "microservices" {
  for_each = toset(var.service_names)
  
  name              = "/aws/eks/${var.cluster_name}/${each.value}"
  retention_in_days = var.log_retention_days
  
  tags = var.tags
}

resource "aws_cloudwatch_dashboard" "ecommerce" {
  dashboard_name = "${var.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_name],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_name]
          ]
          period = 300
          stat   = "Sum"
          region = var.region
          title  = "Application Load Balancer"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_sns_topic" "alerts" {
  name = "${var.name_prefix}-alerts"
  tags = var.tags
}