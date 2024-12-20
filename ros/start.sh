#!/bin/bash
source "/opt/ros/noetic/setup.bash"
source "/catkin_ws/devel/setup.bash"

# Iniciar roscore
roscore &

# Aguardar o roscore iniciar
sleep 5

# Iniciar rosbridge para comunicação websocket
roslaunch rosbridge_server rosbridge_websocket.launch &

# Aqui você pode adicionar outros nós ROS que precisam ser iniciados
# rosrun my_package my_node &

# Manter o container rodando
tail -f /dev/null
