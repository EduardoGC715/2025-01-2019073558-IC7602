output "instance_id" {
  value = aws_instance.private_instance.id
}

output "public_ip" {
  value = aws_instance.private_instance.private_ip
}
