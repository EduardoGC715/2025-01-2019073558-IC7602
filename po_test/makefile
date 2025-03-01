debug:
	helm lint charts/namespaces
	helm lint charts/private
	helm lint charts/public

install:
	helm install namespaces charts/namespaces
	helm install private charts/private
	helm install public charts/public

uninstall:
	-helm uninstall public
	-helm uninstall private
	-helm uninstall namespaces