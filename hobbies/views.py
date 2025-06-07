from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.models import Hobby, UserHobby
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

# Serializer for the Hobby model
from rest_framework import serializers

class HobbySerializer(serializers.ModelSerializer):
    class Meta:
        model = Hobby
        fields = ['id', 'name', 'category']


# General Hobbies API for All Users (Explore Hobbies)
class ExploreHobbiesView(APIView):

    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def get(self, request):
        """Get all hobbies available for exploration."""
        try:
            hobbies = Hobby.objects.all()
            serializer = HobbySerializer(hobbies, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# User-specific Hobby APIs
class UserHobbiesView(APIView):

    authentication_classes = [JWTAuthentication]  # Enforce JWT authentication
    permission_classes = [IsAuthenticated]  # Require authentication

    def get(self, request, user_id):
        """Get all hobbies of a specific user."""
        try:
            user_hobbies = UserHobby.objects.filter(user_id=user_id).select_related('hobby')
            hobbies = [user_hobby.hobby for user_hobby in user_hobbies]
            serializer = HobbySerializer(hobbies, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, user_id):
        """Add a hobby to the user's profile."""
        try:
            hobby_id = request.data.get("hobby_id")

            if not user_id or not hobby_id:
                return Response({"error": "user_id and hobby_id are required."}, status=status.HTTP_400_BAD_REQUEST)

            # Check if hobby already exists for the user
            if UserHobby.objects.filter(user_id=user_id, hobby_id=hobby_id).exists():
                return Response({"error": "Hobby already added."}, status=status.HTTP_400_BAD_REQUEST)

            # Create new UserHobby entry
            UserHobby.objects.create(user_id=user_id, hobby_id=hobby_id)
            return Response({"message": "Hobby added successfully."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, user_id, hobby_id):
        """Delete a specific hobby for a user."""
        try:
            user_hobby = UserHobby.objects.get(user_id=user_id, hobby_id=hobby_id)
            user_hobby.delete()
            return Response({"message": "User's hobby removed successfully."}, status=status.HTTP_200_OK)
        except UserHobby.DoesNotExist:
            return Response({"error": "Hobby not found for the user."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)