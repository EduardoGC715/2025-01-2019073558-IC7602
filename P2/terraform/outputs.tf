output "dns_instance_public_ip" {
  value = module.dns_instance.public_ip
}

output "private_instance_private_ip" {
  value = module.private_instance.private_ip
}