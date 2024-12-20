FROM ros:noetic

# Instalar dependências necessárias
RUN apt-get update && apt-get install -y \
    python3-pip \
    ros-noetic-rosbridge-suite \
    && rm -rf /var/lib/apt/lists/*

# Instalar mqtt-bridge
RUN pip3 install paho-mqtt rospkg

WORKDIR /catkin_ws/src
# Aqui você pode adicionar seus pacotes ROS personalizados
# COPY ./my_ros_pkg .

WORKDIR /catkin_ws
RUN /bin/bash -c "source /opt/ros/noetic/setup.bash && catkin_make"

# Adicionar script de inicialização
COPY ./ros/start.sh /
RUN chmod +x /start.sh

CMD ["/start.sh"]
