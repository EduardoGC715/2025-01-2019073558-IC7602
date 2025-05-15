output "instance_id" {
  value = aws_instance.dns_instance.id
}

output "public_ip" {
  value = aws_instance.dns_instance.public_ip
}
