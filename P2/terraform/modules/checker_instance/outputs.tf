output "instance_id" {
  value = aws_instance.checker_instance.id
}

output "public_ip" {
  value = aws_instance.checker_instance.public_ip
}
