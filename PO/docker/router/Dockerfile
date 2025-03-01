FROM ubuntu:latest 

#RUN cd /etc/yum.repos.d/ 
#RUN sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-* 
#RUN sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-* 
#RUN yum update -y 
#RUN yum install iptables -y 
#RUN echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf 
#RUN yum install -y bind-utils -y

RUN apt-get update
RUN apt-get install build-essential -y
RUN apt-get install curl -y
RUN apt-get install dnsutils -y
RUN apt-get install iptables -y

WORKDIR /app 
# entrar contenedor
# crear un folder llamado /app
# cd /app
 
COPY app/. . 

CMD ["sh", "script.sh"]
#CMD [ "tail", "-f", "/dev/null"]
