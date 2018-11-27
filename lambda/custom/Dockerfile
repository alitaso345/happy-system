FROM amazonlinux

RUN yum update -y && yum install -y gcc-c++ make && install -y zip
RUN curl -sL https://rpm.nodesource.com/setup_8.x | bash -
RUN yum install -y nodejs && yum install -y aws-cli
WORKDIR /app