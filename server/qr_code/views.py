from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.middleware.csrf import get_token
import pymongo
import json
import qrcode
import base64
from io import BytesIO
import os

# MongoDB connection
def get_mongo_client():
    mongo_uri = f"mongodb+srv://gabriel1:gabriel1@cluster0.r0jwe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    client = pymongo.MongoClient(mongo_uri)
    return client

def index(request):
    # Connect to MongoDB
    client = get_mongo_client()
    db = client["rovers"]
    collection = db["data"]
    
    # Get all documents
    rovers = list(collection.find())
    
    # Convert ObjectId to string for JSON serialization
    for rover in rovers:
        if '_id' in rover:
            rover['_id'] = str(rover['_id'])
    
    # Get CSRF token and ensure it's included in the page cookies
    csrf_token = get_token(request)
    
    context = {
        'rovers': rovers,
        'csrf_token': csrf_token
    }
    
    return render(request, 'qr_code/index.html', context)

def generate_qr_code(rover_id, substation_id):
    # Create QR code data
    qr_data = {
        'rover_id': rover_id,
        'substation_id': substation_id
    }
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(json.dumps(qr_data))
    qr.make(fit=True)
    
    # Create an image from the QR Code
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code to BytesIO
    buffer = BytesIO()
    img.save(buffer)
    
    # Convert to base64
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return qr_code_base64

@csrf_exempt
def add_rover(request):
    if request.method == 'POST':
        data = json.loads(request.body.decode('utf-8'))
        rover_id = data.get('rover_id')
        substation_id = data.get('substation_id')
        
        # Connect to MongoDB
        client = get_mongo_client()
        db = client["rovers"]
        collection = db["data"]
        
        # Check if rover_id already exists
        existing_rover = collection.find_one({'rover_id': rover_id})
        if existing_rover:
            return JsonResponse({'status': 'error', 'message': 'Rover ID already exists'}, status=400)
        
        # Generate QR code
        qr_code_base64 = generate_qr_code(rover_id, substation_id)
        
        # Create new document
        new_rover = {
            'rover_id': rover_id,
            'substation_id': substation_id,
            'qr_code': qr_code_base64
        }
        
        # Insert into MongoDB
        collection.insert_one(new_rover)
        
        return JsonResponse({'status': 'success', 'qr_code': qr_code_base64})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def check_rover_id(request):
    if request.method == 'POST':
        data = json.loads(request.body.decode('utf-8'))
        rover_id = data.get('rover_id')
        
        # Connect to MongoDB
        client = get_mongo_client()
        db = client["rovers"]
        collection = db["data"]
        
        # Check if rover_id already exists
        existing_rover = collection.find_one({'rover_id': rover_id})
        
        if existing_rover:
            return JsonResponse({'exists': True})
        else:
            return JsonResponse({'exists': False})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

def rover_detail(request, rover_id):
    # Connect to MongoDB
    client = get_mongo_client()
    db = client["rovers"]
    collection = db["data"]
    
    # Find the rover document
    rover = collection.find_one({'rover_id': rover_id})
    
    if not rover:
        return HttpResponse('Rover not found', status=404)
    
    # Convert ObjectId to string for JSON serialization
    if '_id' in rover:
        rover['_id'] = str(rover['_id'])
    
    # Get CSRF token for detail page too
    csrf_token = get_token(request)
    
    context = {
        'rover': rover,
        'csrf_token': csrf_token
    }
    
    return render(request, 'qr_code/detail.html', context)
