output "instance_id" {
  value = aws_instance.ui_instance.id
}

output "public_ip" {
  value = aws_instance.ui_instance.public_ip
}
