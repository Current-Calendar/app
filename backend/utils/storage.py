from storages.backends.s3boto3 import S3Boto3Storage

class PublicMediaStorage(S3Boto3Storage):
    location = 'media'
    default_acl = 'public-read'
    file_overwrite = False
    querystring_auth = False

def get_signed_url(request, file_field):
    if not file_field:
        return None
    try:
        url = file_field.url
        if url.startswith('http'):
            return url
        return request.build_absolute_uri(url)
    except Exception:
        return None
