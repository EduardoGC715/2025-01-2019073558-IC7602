output "public_subnet_id" {
  value = aws_subnet.public_subnet.id
}

output "public_subnet_cidr_block" {
  value = aws_subnet.public_subnet.cidr_block
}

output "vpc_id" {
  value = aws_vpc.p1_vpc.id
}

output "private_subnet_id" {
  value = aws_subnet.private_subnet.id
}

output "nat_gateway_id" {
  value = aws_nat_gateway.nat_gateway.id
}