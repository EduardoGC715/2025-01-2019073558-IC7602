output "instance_id" {
  value = aws_instance.private_instance.id
}

output "private_ip" {
  value = aws_instance.private_instance.private_ip
}
