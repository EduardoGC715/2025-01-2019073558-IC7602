
add:
	@echo "Applying Terraform configuration"
	terraform apply -var-file="secrets.tfvars"

adda:
	@echo "Applying Terraform configuration"
	terraform apply -var-file="secrets.tfvars" -auto-approve

dest:
	@echo "Destroying Terraform configuration"
	terraform destroy -var-file="secrets.tfvars" $(TF_FLAGS)

desta:
	@echo "Destroying Terraform configuration"
	terraform destroy -var-file="secrets.tfvars" $(TF_FLAGS) -auto-approve