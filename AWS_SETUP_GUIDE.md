# 🚀 Guía Completa de Configuración de AWS para Videos

Esta guía te explica **paso a paso** cómo configurar AWS S3 para hospedar tus videos con encriptación KMS.

---

## 📋 Resumen: ¿Qué necesitas?

- ✅ Cuenta de AWS
- ✅ Bucket S3: `pnptv-previews` (ya existe)
- ✅ KMS Key: `media-x` (ya existe)
- ⏳ Credenciales IAM (crear)
- ⏳ Configurar bucket
- ⏳ Variables de entorno

---

## 🔧 PASO 1: Crear Usuario IAM

### 1.1 Crear el usuario

1. Ve a **AWS Console** → **IAM** → **Users**
2. Click **"Create user"**
3. Nombre: `pnptv-api-user`
4. Selecciona: ✅ **"Programmatic access"**
5. Click **"Next: Permissions"**

### 1.2 Asignar permisos

**Opción A - Política personalizada (RECOMENDADA - Más segura):**

1. Click **"Attach policies directly"**
2. Click **"Create policy"**
3. En la pestaña JSON, pega esto:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3VideoAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::pnptv-previews",
        "arn:aws:s3:::pnptv-previews/*"
      ]
    },
    {
      "Sid": "KMSEncryption",
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-2:*:key/*"
    }
  ]
}
```

4. Click **"Next: Tags"** (opcional, puedes saltar)
5. Click **"Next: Review"**
6. Nombre de la política: `PNPTVVideoUploadPolicy`
7. Click **"Create policy"**
8. Regresa a la creación del usuario y selecciona esta política

**Opción B - Política administrada (Más fácil pero menos segura):**

- Busca y selecciona: `AmazonS3FullAccess`

### 1.3 Descargar credenciales

1. Click **"Next"** → **"Create user"**
2. **⚠️ IMPORTANTE**: Descarga el CSV con las credenciales
   - `AWS_ACCESS_KEY_ID` (empieza con AKIA...)
   - `AWS_SECRET_ACCESS_KEY` (string largo)
3. **Guárdalas en un lugar seguro** - solo se muestran una vez

---

## 📦 PASO 2: Configurar Bucket S3 `pnptv-previews`

### 2.1 Desbloquear acceso público

1. AWS Console → **S3** → `pnptv-previews`
2. Pestaña **"Permissions"**
3. En **"Block public access"**, click **"Edit"**
4. **DESACTIVA** todas las opciones (uncheck todo):
   - ❌ Block all public access
   - ❌ Block public access to buckets and objects granted through new ACLs
   - ❌ Block public access to buckets and objects granted through any ACLs
   - ❌ Block public access to buckets and objects granted through new public bucket policies
   - ❌ Block public and cross-account access through any public bucket policies
5. Click **"Save changes"**
6. Escribe `confirm` cuando te lo pida

### 2.2 Bucket Policy (permitir lectura pública)

1. En **"Permissions"** → **"Bucket policy"**
2. Click **"Edit"**
3. Pega esta política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pnptv-previews/*"
    }
  ]
}
```

4. Click **"Save changes"**

### 2.3 CORS Configuration

1. En **"Permissions"** → **"Cross-origin resource sharing (CORS)"**
2. Click **"Edit"**
3. Pega esto:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "https://pnptv.app",
      "https://previews.pnptv.app",
      "http://localhost:3001",
      "http://localhost:33010"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

4. Click **"Save changes"**

### 2.4 Encriptación por defecto con KMS

1. Pestaña **"Properties"**
2. Scroll hasta **"Default encryption"**
3. Click **"Edit"**
4. Selecciona: **"Server-side encryption with AWS KMS keys (SSE-KMS)"**
5. **AWS KMS key**: Selecciona **"Choose from your AWS KMS keys"**
6. Busca y selecciona: `media-x` (o `alias/media-x`)
7. ✅ Activa **"Bucket Key"** (reduce costos de KMS)
8. Click **"Save changes"**

---

## 🔑 PASO 3: Obtener KMS Key ARN

1. AWS Console → **KMS** (Key Management Service)
2. Menú izquierdo: **"Customer managed keys"**
3. Busca tu key: `media-x`
4. Click en el **Key ID** para ver detalles
5. Copia el **ARN completo** (se ve así):
   ```
   arn:aws:kms:us-east-2:123456789012:key/12345678-1234-1234-1234-123456789012
   ```
6. Guárdalo, lo necesitarás para `.env`

---

## ⚙️ PASO 4: Configurar Variables de Entorno

Edita tu archivo `.env` y agrega estas variables:

```env
# ============================================
# AWS S3 VIDEO HOSTING CONFIGURATION
# ============================================

# AWS Region
AWS_REGION=us-east-2

# Credenciales IAM (del Paso 1.3)
AWS_ACCESS_KEY_ID=AKIA...tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key_aqui

# S3 Bucket
AWS_S3_BUCKET=pnptv-previews

# KMS Key ARN (del Paso 3)
AWS_KMS_KEY_ARN=arn:aws:kms:us-east-2:TU_ACCOUNT:key/TU_KEY_ID

# CloudFront CDN (opcional, configurar después)
CLOUDFRONT_DOMAIN=

# Video settings
VIDEO_UPLOAD_DIR=./uploads/videos
THUMBNAIL_DIR=./uploads/thumbnails
MAX_VIDEO_SIZE_MB=500
ALLOWED_VIDEO_FORMATS=mp4,mov,avi
```

**⚠️ NUNCA hagas commit del archivo `.env` a Git** - Las credenciales deben permanecer secretas.

---

## 🌐 PASO 5: CloudFront CDN (OPCIONAL pero recomendado)

CloudFront acelera la entrega de videos globalmente usando un CDN.

### 5.1 Crear distribución

1. AWS Console → **CloudFront** → **"Create distribution"**
2. **Origin settings:**
   - Origin domain: `pnptv-previews.s3.us-east-2.amazonaws.com`
   - Origin path: (dejar vacío)
   - Origin access: **Public**
3. **Default cache behavior:**
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP methods: **GET, HEAD, OPTIONS**
   - Cache policy: **CachingOptimized**
4. **Settings:**
   - Alternate domain names (CNAMEs): `previews.pnptv.app`
   - Custom SSL certificate:
     - Puedes solicitar uno gratis en **AWS Certificate Manager (ACM)**
     - O usar el certificado de CloudFront por defecto
5. Click **"Create distribution"**

### 5.2 Esperar deployment

- El despliegue tarda **15-30 minutos**
- Estado cambiará de "In Progress" a "Deployed"

### 5.3 Obtener el dominio

1. Cuando esté "Deployed", copia el **Distribution domain name**
   - Ejemplo: `d1234abcd5678.cloudfront.net`
2. Actualiza tu `.env`:
   ```env
   CLOUDFRONT_DOMAIN=d1234abcd5678.cloudfront.net
   ```

### 5.4 Configurar DNS (en tu proveedor de dominio)

Si quieres usar `previews.pnptv.app`:

1. Ve a tu proveedor de DNS (donde compraste pnptv.app)
2. Crea un registro CNAME:
   - Tipo: `CNAME`
   - Nombre: `previews`
   - Valor: `d1234abcd5678.cloudfront.net` (tu dominio de CloudFront)
   - TTL: `300`
3. Guarda y espera propagación (5-60 minutos)

---

## ✅ PASO 6: Verificar que Todo Funciona

### Test 1: Verificar credenciales

```bash
# En tu proyecto
npm run dev
```

Deberías ver en los logs:
```
S3Service initialized {
  bucket: 'pnptv-previews',
  region: 'us-east-2',
  kmsEnabled: true,
  cloudfrontEnabled: true/false
}
```

### Test 2: Subir un video de prueba

Usa tu aplicación para subir un video:
1. Ve a la página de upload
2. Sube un video
3. El video debería aparecer en S3

### Test 3: Verificar en AWS Console

1. Ve a S3 → `pnptv-previews`
2. Deberías ver tu video en `videos/USER_ID/...`
3. Click en el archivo → **Properties**
4. Verifica que **Server-side encryption** muestra: **AWS-KMS**

### Test 4: Acceso público

Copia la URL del video y ábrela en el navegador:
```
https://pnptv-previews.s3.us-east-2.amazonaws.com/videos/...
```

O si configuraste CloudFront:
```
https://previews.pnptv.app/videos/...
```

El video debería cargar correctamente.

---

## 🔒 Seguridad y Mejores Prácticas

### ✅ Hacer:
- ✅ Rotar credenciales cada 90 días
- ✅ Habilitar MFA en tu cuenta de AWS
- ✅ Usar políticas con permisos mínimos
- ✅ Monitorear logs de acceso de S3
- ✅ Usar CloudFront con HTTPS únicamente
- ✅ Revisar facturas de AWS mensualmente

### ❌ NO Hacer:
- ❌ NUNCA hacer commit de `.env` a Git
- ❌ NUNCA compartir tus AWS credentials
- ❌ NUNCA usar credenciales root de AWS
- ❌ NUNCA deshabilitar encriptación KMS
- ❌ NUNCA permitir escritura pública en S3

---

## 💰 Estimación de Costos

Para **1000 videos** (15-45 segundos, ~50MB promedio):

| Servicio | Uso Estimado | Costo Mensual |
|----------|--------------|---------------|
| **S3 Storage** | 50GB @ $0.023/GB | ~$1.15 |
| **S3 Requests** | 10,000 PUT @ $0.005/1000 | ~$0.05 |
| **KMS** | 1 key + requests | ~$1.03 |
| **CloudFront** | 100GB transfer | ~$8.50 |
| **Total** | | **~$10-12/mes** |

- Primeros 12 meses: Algunas cosas son gratis (AWS Free Tier)
- Para más videos, los costos escalan proporcionalmente

---

## 🆘 Solución de Problemas

### Error: "Access Denied"
✅ **Solución:**
- Verifica que las credenciales IAM son correctas
- Confirma que el usuario IAM tiene permisos S3 y KMS
- Revisa la Bucket Policy

### Error: "Invalid KMS Key"
✅ **Solución:**
- Asegúrate que el KMS key está en `us-east-2`
- Verifica que el ARN es correcto en `.env`
- Confirma que el IAM user tiene permiso `kms:Encrypt`

### Videos no cargan desde CloudFront
✅ **Solución:**
- Espera 15-30 minutos para deployment
- Verifica configuración DNS
- Comprueba que el certificado SSL está validado

### Error de CORS
✅ **Solución:**
- Verifica configuración CORS en S3
- Asegúrate que tu dominio está en AllowedOrigins
- CloudFront debe permitir OPTIONS requests

---

## 📞 Recursos Adicionales

- **AWS S3 Docs:** https://docs.aws.amazon.com/s3/
- **CloudFront Guide:** https://docs.aws.amazon.com/cloudfront/
- **KMS Documentation:** https://docs.aws.amazon.com/kms/
- **Soporte AWS:** https://console.aws.amazon.com/support/

---

## ✨ ¡Listo!

Después de configurar AWS:

✅ Tus videos se subirán automáticamente a S3
✅ Encriptación KMS automática
✅ URLs públicas accesibles
✅ CDN rápido con CloudFront (opcional)
✅ Escalable para millones de videos

**Los videos estarán disponibles en:**
- `https://pnptv-previews.s3.us-east-2.amazonaws.com/videos/...`
- `https://previews.pnptv.app/videos/...` (con CloudFront)

¡Tu sistema de hosting de videos está listo! 🎉
