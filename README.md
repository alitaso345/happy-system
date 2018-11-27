```
$docker build -t ec2 .
$docker run --rm -it -v $(PWD):/app ec2
```

```
$npm install
$zip -r ./package.zip *
```

```
$aws configure --profile user_name
=>
AWS Access Key ID [None]: xxxx
AWS Secret Access Key [None]: xxxx
Default region name [None]: ap-northeast-1
Default output format [None]:
```

```
aws lambda update-function-code --function-name function_name --zip-file fileb://./package.zip --profile user_name --publish
```