zip:
	zip -r ./deploy-package.zip *
deploy:
	aws lambda update-function-code --function-name yumenikki --zip-file fileb://./deploy-package.zip --publish