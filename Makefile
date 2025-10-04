.PHONY: help init plan apply destroy fmt validate lint security

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

init: ## Initialize Terraform for all environments
	@for env in dev qa stage prod; do \
		echo "Initializing $$env..."; \
		cd environments/$$env && terraform init && cd ../..; \
	done

plan: ## Run terraform plan for specified environment (ENV=dev|qa|stage|prod)
	@if [ -z "$(ENV)" ]; then echo "Please specify ENV (dev|qa|stage|prod)"; exit 1; fi
	cd environments/$(ENV) && terraform plan

apply: ## Run terraform apply for specified environment (ENV=dev|qa|stage|prod)
	@if [ -z "$(ENV)" ]; then echo "Please specify ENV (dev|qa|stage|prod)"; exit 1; fi
	cd environments/$(ENV) && terraform apply

destroy: ## Run terraform destroy for specified environment (ENV=dev|qa|stage|prod)
	@if [ -z "$(ENV)" ]; then echo "Please specify ENV (dev|qa|stage|prod)"; exit 1; fi
	cd environments/$(ENV) && terraform destroy

fmt: ## Format all Terraform files
	terraform fmt -recursive

validate: ## Validate all Terraform configurations
	@for env in dev qa stage prod; do \
		echo "Validating $$env..."; \
		cd environments/$$env && terraform init -backend=false && terraform validate && cd ../..; \
	done

lint: ## Run TFLint on all configurations
	@for env in dev qa stage prod; do \
		echo "Linting $$env..."; \
		cd environments/$$env && tflint && cd ../..; \
	done

security: ## Run security checks with Checkov
	@for env in dev qa stage prod; do \
		echo "Security scan for $$env..."; \
		checkov -d environments/$$env --framework terraform; \
	done

setup-remote-state: ## Setup remote state infrastructure
	cd remote-state && terraform init && terraform apply