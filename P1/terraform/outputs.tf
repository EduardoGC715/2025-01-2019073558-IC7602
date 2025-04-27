output "dns_instance_public_ip" {
  value = module.dns_instance.public_ip
}

output "ui_instance_public_ip" {
  value = module.ui_instance.public_ip
}