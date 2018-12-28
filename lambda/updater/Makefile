zip:
	zip -r ./deploy-package.zip *
deploy:
	docker run --rm -v $(PWD):/app ec2 make zip
	aws lambda update-function-code --function-name yumenikki-updater --zip-file fileb://./deploy-package.zip --publish