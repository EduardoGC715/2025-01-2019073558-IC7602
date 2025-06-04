output "instance_id" {
  value = aws_instance.zonal_cache_instance.id
}

output "public_ip" {
  value = aws_instance.zonal_cache_instance.public_ip
}
