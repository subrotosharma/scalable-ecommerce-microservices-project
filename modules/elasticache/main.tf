resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-cache-subnet"
  subnet_ids = var.subnet_ids

  tags = var.tags
}

resource "aws_security_group" "elasticache" {
  name_prefix = "${var.name_prefix}-cache-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr_block]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-cache-sg"
  })
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.name_prefix}-redis"
  description                = "Redis cluster for ${var.name_prefix}"
  
  node_type                  = var.node_type
  port                       = var.port
  parameter_group_name       = var.parameter_group_name
  
  num_cache_clusters         = var.num_cache_clusters
  
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.elasticache.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = var.tags
}