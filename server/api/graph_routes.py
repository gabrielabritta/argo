import json
import os
import pandas as pd
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from pathlib import Path

# Path to the graph and obstacles data
BASE_DIR = Path(__file__).resolve().parent.parent
GRAPH_PATH = os.path.join(BASE_DIR, "../RoverModel/jsons/graph6.json")
OBSTACLES_PATH = os.path.join(BASE_DIR, "../RoverModel/planilhas/obstaculos_processado6.xlsx")

# Cache for the data to avoid reading files on every request
graph_data_cache = None
obstacles_cache = None

# Colors for different obstacle types
OBSTACLE_COLORS = {
    "building": "#8B4513",  # Brown
    "vegetation": "#228B22",  # Forest Green
    "water": "#1E90FF",     # Dodger Blue
    "default": "#A9A9A9"    # Dark Gray
}

def load_graph_data():
    """Load graph data from JSON file"""
    global graph_data_cache
    
    if graph_data_cache is not None:
        return graph_data_cache
    
    try:
        with open(GRAPH_PATH, 'r') as file:
            graph_data = json.load(file)
            
            # Add edges data if not present in the original JSON
            if 'edges' not in graph_data:
                # Create edges from the adjacency list if available
                edges = []
                if 'adjacency' in graph_data:
                    for node, neighbors in graph_data['adjacency'].items():
                        for neighbor in neighbors:
                            edges.append([node, neighbor])
                graph_data['edges'] = edges
                
            graph_data_cache = graph_data
            return graph_data
    except Exception as e:
        print(f"Error loading graph data: {e}")
        # Return a minimal valid graph structure
        return {"nodes": {}, "edges": []}

def load_obstacles():
    """Load obstacles data from Excel file"""
    global obstacles_cache
    
    if obstacles_cache is not None:
        return obstacles_cache
    
    try:
        # Check if file exists
        if not os.path.exists(OBSTACLES_PATH):
            return []
            
        # Read Excel file
        df = pd.read_excel(OBSTACLES_PATH)
        
        obstacles = []
        for _, row in df.iterrows():
            # Assuming the Excel has columns like 'x', 'y', 'width', 'height', 'type'
            # Adapt these column names based on the actual Excel structure
            obstacle_type = row.get('type', 'default')
            obstacles.append({
                "pos": [row.get('x', 0), row.get('y', 0)],
                "size": [row.get('width', 5), row.get('height', 5)],
                "color": OBSTACLE_COLORS.get(obstacle_type, OBSTACLE_COLORS['default']),
                "type": obstacle_type
            })
        
        obstacles_cache = obstacles
        return obstacles
    except Exception as e:
        print(f"Error loading obstacles: {e}")
        return []

@api_view(['GET'])
def get_graph_data(request):
    """API endpoint to get graph data"""
    try:
        graph_data = load_graph_data()
        return Response(graph_data)
    except Exception as e:
        return Response({"error": f"Error fetching graph data: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_obstacles(request):
    """API endpoint to get obstacles data"""
    try:
        obstacles = load_obstacles()
        return Response(obstacles)
    except Exception as e:
        return Response({"error": f"Error fetching obstacles: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Sample data for development/testing
@api_view(['GET'])
def get_sample_graph_data(request):
    """API endpoint to get sample graph data for development"""
    sample_data = {
        "nodes": {
            "(-50, -50)": {"label": "start_point"},
            "(50, 50)": {"label": "end_point"},
            "(0, 0)": {"label": "center"},
            "(-30, 30)": {"label": "point1"},
            "(30, -30)": {"label": "point2"}
        },
        "edges": [
            ["(-50, -50)", "(-30, 30)"],
            ["(-30, 30)", "(0, 0)"],
            ["(0, 0)", "(30, -30)"],
            ["(30, -30)", "(50, 50)"]
        ]
    }
    return Response(sample_data)

@api_view(['GET'])
def get_sample_obstacles(request):
    """API endpoint to get sample obstacles for development"""
    sample_obstacles = [
        {"pos": [-20, -20], "size": [10, 10], "color": OBSTACLE_COLORS["building"], "type": "building"},
        {"pos": [20, 20], "size": [15, 8], "color": OBSTACLE_COLORS["vegetation"], "type": "vegetation"},
        {"pos": [0, -30], "size": [8, 8], "color": OBSTACLE_COLORS["water"], "type": "water"}
    ]
    return Response(sample_obstacles)
