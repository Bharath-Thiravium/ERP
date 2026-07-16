import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from authentication.authentication import ServiceUserSessionAuthentication
from rest_framework.permissions import IsAuthenticated

from .models import PermitToWork
from .serializers import PermitToWorkSerializer
from .ocr_service import extract_ptw_fields

logger = logging.getLogger(__name__)


class PermitToWorkViewSet(viewsets.ModelViewSet):
    serializer_class = PermitToWorkSerializer
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return PermitToWork.objects.all()

    @action(detail=False, methods=['post'], url_path='ocr-extract',
            parser_classes=[MultiPartParser, FormParser])
    def ocr_extract(self, request):
        """
        Upload a PTW document image and receive extracted field values.
        Does NOT save to DB — returns data for the frontend form to populate.
        """
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        allowed_types = {'image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'image/webp'}
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': f'Unsupported file type: {image_file.content_type}. Use JPEG, PNG, TIFF, BMP, or WebP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = extract_ptw_fields(image_file)

        if 'error' in result:
            logger.error(f"PTW OCR error: {result['error']}")
            return Response(
                {'error': 'OCR processing failed. Please try a clearer image.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        logger.info(
            f"PTW OCR extracted {len(result['fields'])} fields "
            f"with {result['ocr_confidence']}% confidence"
        )

        return Response({
            'fields': result['fields'],
            'ocr_confidence': result['ocr_confidence'],
            'low_confidence_fields': result['low_confidence_fields'],
        })
