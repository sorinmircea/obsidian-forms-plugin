VERSION := 1.0.14

tag:
	git tag -a $(VERSION) -m "$(VERSION)"

push:
	git push origin $(VERSION)

release: tag push
	@echo "Version $(VERSION) released successfully!"
