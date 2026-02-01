# Dashboard2 - Especificación de API para Android

> Documento de referencia para desarrollar la aplicación Android que se conecta al Dashboard2

**Fecha de creación:** 2026-01-25
**Versión del Backend:** Next.js 16.1.2
**URL Base (Producción):** `https://your-dashboard.netlify.app`

---

## 📋 Tabla de Contenidos

1. [Información General](#información-general)
2. [Sistema de Autenticación](#sistema-de-autenticación)
3. [Modelos de Datos](#modelos-de-datos)
4. [Endpoints de API](#endpoints-de-api)
5. [Reglas de Negocio](#reglas-de-negocio)
6. [Ejemplos de Implementación Android](#ejemplos-de-implementación-android)
7. [Manejo de Errores](#manejo-de-errores)
8. [Seguridad y Mejores Prácticas](#seguridad-y-mejores-prácticas)

---

## 🌐 Información General

### Tech Stack del Backend
- **Framework:** Next.js 16.1.2 (App Router)
- **Runtime:** Node.js
- **Hosting:** Netlify (serverless)
- **Base de Datos:** Netlify DB (Postgres via Neon)
- **Autenticación:** Token-based (custom implementation)

### Arquitectura de Datos (CRÍTICO)
**TODOS los datos están centralizados en Netlify DB:**
- ✅ La aplicación web y la app Android comparten los **mismos datos**
- ✅ **TODOs** (`/api/todos`): Lista compartida de tareas
- ✅ **Estado de aplicaciones** (`/api/results`): YouTube, Twitter, Instagram, GitHub, extensiones
- ✅ **Datos privados** (`/api/private/data`): Precios de criptomonedas (requiere autenticación)
- ✅ **Consistencia fuerte** garantiza que los cambios sean inmediatamente visibles
- ✅ Cuando se actualiza desde Web o Android, se refleja instantáneamente en ambas plataformas
- ✅ NO hay datos independientes - es una única fuente de verdad para todo

### URL Base
```
Production: https://your-dashboard.netlify.app
```

### Formato de Datos
- Todos los requests y responses son JSON
- Content-Type: `application/json`
- Timestamps en formato ISO 8601 (UTC)
- Encoding: UTF-8

### Sincronización de Datos

**IMPORTANTE:** TODOS los datos están almacenados en Netlify DB (almacenamiento centralizado en el servidor). Esto significa:

- **Sincronización automática:** Todos los datos son los mismos en la web y en Android
- **Fuente única de verdad:** No hay "sincronización" manual - ambas plataformas consultan el mismo backend
- **Actualizaciones en tiempo real:** Los cambios aparecen inmediatamente en todas las plataformas al refrescar
- **No hay caché local persistente:** La app Android debe consultar el API para obtener los datos más recientes
- **Recomendación:** Implementa refresh automático o pull-to-refresh en Android para mantener la UI actualizada

```
Flujo de datos TODOs:
1. Usuario crea TODO en Android
2. POST /api/todos → Guarda en Netlify DB
3. Usuario abre la web → GET /api/todos → Lee desde Netlify DB
4. Resultado: El mismo TODO aparece en ambas plataformas

Flujo de datos del Dashboard:
1. Scraper actualiza datos (YouTube, Twitter, etc.)
2. POST /api/scrape → Guarda en Netlify DB
3. Usuario abre Android → GET /api/results → Lee desde Netlify DB
4. Resultado: Los mismos datos aparecen en Web y Android
```

---

## 🔐 Sistema de Autenticación

### Flujo de Autenticación

```
1. Usuario ingresa password en la app Android
2. App envía POST /api/auth/verify con { password }
3. Backend valida con bcrypt (costo factor 12)
4. Si es válido, backend genera token aleatorio de 32 bytes
5. Backend devuelve { token, expiresAt }
6. App guarda token de forma segura
7. App incluye token en todas las requests protegidas
```

### Características del Token
- **Formato:** String hexadecimal de 64 caracteres (32 bytes)
- **Expiración:** 30 minutos desde la generación
- **Almacenamiento:** In-memory en el servidor (se pierde al reiniciar)
- **Header:** `Authorization: Bearer {token}`

### Login - POST /api/auth/verify

**Request:**
```http
POST /api/auth/verify HTTP/1.1
Host: your-dashboard.netlify.app
Content-Type: application/json

{
  "password": "tu-password-secreto"
}
```

**Response Exitosa (200 OK):**
```json
{
  "success": true,
  "token": "a1b2c3d4e5f6...64-char-hex-string",
  "expiresAt": 1737800400000
}
```

**Errores:**

| Código | Respuesta | Significado |
|--------|-----------|-------------|
| 400 | `{"success": false, "error": "Password required"}` | No se envió password |
| 401 | `{"success": false, "error": "Invalid password"}` | Password incorrecto (delay de 1 segundo) |
| 500 | `{"success": false, "error": "Server configuration error"}` | Variable de entorno no configurada |

### Uso del Token en Requests

Todas las rutas protegidas requieren el header:

```http
Authorization: Bearer a1b2c3d4e5f6...64-char-hex-string
```

Si el token es inválido o expiró:
```json
{
  "error": "Invalid or expired token"
}
```
Código HTTP: **401 Unauthorized**

---

## 📊 Modelos de Datos

### Todo

```kotlin
data class Todo(
    val id: String,              // Formato: "timestamp-random" ej: "1737800400000-a3k9m2x"
    val text: String,            // Descripción del TODO (max 500 chars)
    val completed: Boolean,      // Estado de completado
    val createdAt: String,       // ISO 8601: "2026-01-25T10:30:00.000Z"
    val completedAt: String?     // ISO 8601 o null si no está completado
)
```

**Ejemplo JSON:**
```json
{
  "id": "1737800400000-a3k9m2x",
  "text": "Implementar pantalla de login en Android",
  "completed": false,
  "createdAt": "2026-01-25T10:30:00.000Z",
  "completedAt": null
}
```

### TodoListData

```kotlin
data class TodoListData(
    val todos: List<Todo>,       // Lista de todos los TODOs
    val lastModified: String     // ISO 8601 de última modificación
)
```

**Ejemplo JSON:**
```json
{
  "todos": [
    {
      "id": "1737800400000-a3k9m2x",
      "text": "Implementar pantalla de login",
      "completed": false,
      "createdAt": "2026-01-25T10:30:00.000Z",
      "completedAt": null
    },
    {
      "id": "1737800500000-b7x2n4k",
      "text": "Crear modelo de datos Todo",
      "completed": true,
      "createdAt": "2026-01-25T11:00:00.000Z",
      "completedAt": "2026-01-25T11:15:00.000Z"
    }
  ],
  "lastModified": "2026-01-25T11:15:00.000Z"
}
```

### DashboardData (Público)

```kotlin
data class YoutubeResult(
    val success: Boolean,
    val lastVideo: String?,
    val error: String?
)

data class TwitterResult(
    val success: Boolean,
    val lastTweet: String?,
    val totalTweets: String?,
    val error: String?
)

data class InstagramResult(
    val success: Boolean,
    val lastPost: String?,
    val error: String?
)

data class GithubResult(
    val success: Boolean,
    val version: String?,
    val downloads: Int?,
    val releaseDate: String?,
    val error: String?
)

data class ExtensionResult(
    val name: String,
    val extensionId: String,
    val success: Boolean,
    val available: Boolean?,
    val functionalTest: Boolean?,
    val error: String?
)

data class DashboardResults(
    val youtube: YoutubeResult,
    val twitter: TwitterResult,
    val instagram: InstagramResult,
    val github: GithubResult,
    val extensions: List<ExtensionResult>
)

data class PublicDashboardData(
    val timestamp: String?,
    val results: DashboardResults?
)
```

**Ejemplo JSON:**
```json
{
  "timestamp": "2026-01-25T12:00:00.000Z",
  "results": {
    "youtube": {
      "success": true,
      "lastVideo": "2 weeks ago"
    },
    "twitter": {
      "success": true,
      "lastTweet": "5h",
      "totalTweets": "1,284"
    },
    "instagram": {
      "success": true,
      "lastPost": "60 posts, 30 followers"
    },
    "github": {
      "success": true,
      "version": "v1.5.0",
      "downloads": 16,
      "releaseDate": "2025-10-09T00:00:00.000Z"
    },
    "extensions": [
      {
        "name": "YouTube Only First Video",
        "extensionId": "nehhphibaeodomkkffididpjmlcigbdp",
        "success": true,
        "available": true,
        "functionalTest": false
      }
    ]
  }
}
```

### CryptoData (Privado)

```kotlin
data class CryptoPrice(
    val price: Double,           // Precio en EUR
    val change24h: Double        // Cambio porcentual en 24h
)

data class CryptoData(
    val timestamp: String?,      // ISO 8601
    val crypto: CryptoResult?
)

data class CryptoResult(
    val success: Boolean,
    val btc: CryptoPrice?,       // Bitcoin
    val sol: CryptoPrice?,       // Solana
    val error: String?
)
```

**Ejemplo JSON:**
```json
{
  "timestamp": "2026-01-25T12:00:00.000Z",
  "crypto": {
    "success": true,
    "btc": {
      "price": 85420.50,
      "change24h": 2.34
    },
    "sol": {
      "price": 145.67,
      "change24h": -1.23
    }
  }
}
```

---

## 🔌 Endpoints de API

**IMPORTANTE:** Todos los endpoints leen/escriben desde Netlify Blobs (almacenamiento centralizado). Los datos son compartidos entre Web y Android automáticamente.

### 1. Autenticación

#### POST /api/auth/verify
Ya documentado en la sección [Sistema de Autenticación](#sistema-de-autenticación)

---

### 2. TODOs (Requieren Autenticación)

#### GET /api/todos - Obtener Todos los TODOs

**Request:**
```http
GET /api/todos HTTP/1.1
Host: your-dashboard.netlify.app
Authorization: Bearer {token}
```

**Response Exitosa (200 OK):**
```json
{
  "todos": [
    {
      "id": "1737800400000-a3k9m2x",
      "text": "Primer TODO",
      "completed": false,
      "createdAt": "2026-01-25T10:30:00.000Z",
      "completedAt": null
    }
  ],
  "lastModified": "2026-01-25T10:30:00.000Z"
}
```

**Errores:**
- 401: Token inválido o expirado
- 500: Error del servidor

---

#### POST /api/todos - Crear Nuevo TODO

**Request:**
```http
POST /api/todos HTTP/1.1
Host: your-dashboard.netlify.app
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "Implementar RecyclerView para TODOs"
}
```

**Response Exitosa (201 Created):**
```json
{
  "id": "1737800400000-a3k9m2x",
  "text": "Implementar RecyclerView para TODOs",
  "completed": false,
  "createdAt": "2026-01-25T10:30:00.000Z",
  "completedAt": null
}
```

**Validaciones:**
- `text` es requerido
- `text` no puede estar vacío (después de trim)
- `text` máximo 500 caracteres
- Máximo 200 TODOs por usuario

**Errores:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | `{"error": "Text is required"}` | Campo text faltante o vacío |
| 400 | `{"error": "Text too long (max 500 characters)"}` | Texto excede 500 chars |
| 400 | `{"error": "Maximum todo limit reached (200)"}` | Ya hay 200 TODOs |
| 401 | `{"error": "Invalid or expired token"}` | Token inválido |
| 500 | `{"error": "Failed to create todo"}` | Error del servidor |

---

#### PUT /api/todos - Actualizar TODO

**Request (actualizar texto):**
```http
PUT /api/todos HTTP/1.1
Host: your-dashboard.netlify.app
Authorization: Bearer {token}
Content-Type: application/json

{
  "id": "1737800400000-a3k9m2x",
  "text": "Implementar RecyclerView con DiffUtil"
}
```

**Request (marcar como completado):**
```http
PUT /api/todos HTTP/1.1
Host: your-dashboard.netlify.app
Authorization: Bearer {token}
Content-Type: application/json

{
  "id": "1737800400000-a3k9m2x",
  "completed": true
}
```

**Request (actualizar ambos):**
```http
PUT /api/todos HTTP/1.1
Host: your-dashboard.netlify.app
Authorization: Bearer {token}
Content-Type: application/json

{
  "id": "1737800400000-a3k9m2x",
  "text": "Implementar RecyclerView con DiffUtil",
  "completed": true
}
```

**Response Exitosa (200 OK):**
```json
{
  "id": "1737800400000-a3k9m2x",
  "text": "Implementar RecyclerView con DiffUtil",
  "completed": true,
  "createdAt": "2026-01-25T10:30:00.000Z",
  "completedAt": "2026-01-25T11:45:00.000Z"
}
```

**Nota Importante:** Cuando se marca `completed: true`, el backend automáticamente establece `completedAt` al timestamp actual. Cuando se marca `completed: false`, `completedAt` se establece a `null`.

**Validaciones:**
- `id` es requerido
- Si se proporciona `text`: debe ser no vacío (después de trim) y máximo 500 caracteres
- `text` y `completed` son opcionales, pero al menos uno debe estar presente

**Errores:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | `{"error": "Todo ID is required"}` | ID faltante o inválido |
| 400 | `{"error": "Text cannot be empty"}` | Texto vacío |
| 400 | `{"error": "Text too long (max 500 characters)"}` | Texto excede 500 chars |
| 404 | `{"error": "Todo not found"}` | TODO con ese ID no existe |
| 401 | `{"error": "Invalid or expired token"}` | Token inválido |
| 500 | `{"error": "Failed to update todo"}` | Error del servidor |

---

#### DELETE /api/todos - Eliminar TODO

**Request:**
```http
DELETE /api/todos HTTP/1.1
Host: your-dashboard.netlify.app
Authorization: Bearer {token}
Content-Type: application/json

{
  "id": "1737800400000-a3k9m2x"
}
```

**Response Exitosa (200 OK):**
```json
{
  "success": true
}
```

**Errores:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | `{"error": "Todo ID is required"}` | ID faltante o inválido |
| 404 | `{"error": "Todo not found"}` | TODO con ese ID no existe |
| 401 | `{"error": "Invalid or expired token"}` | Token inválido |
| 500 | `{"error": "Failed to delete todo"}` | Error del servidor |

---

### 3. Dashboard Privado (Requiere Autenticación)

#### GET /api/private/data - Obtener Datos Privados (Crypto)

**Request:**
```http
GET /api/private/data HTTP/1.1
Host: your-dashboard.netlify.app
Authorization: Bearer {token}
```

**Response Exitosa (200 OK):**
```json
{
  "timestamp": "2026-01-25T12:00:00.000Z",
  "crypto": {
    "success": true,
    "btc": {
      "price": 85420.50,
      "change24h": 2.34
    },
    "sol": {
      "price": 145.67,
      "change24h": -1.23
    }
  }
}
```

**Response si no hay datos:**
```json
{
  "timestamp": null,
  "crypto": null,
  "message": "No data available yet. Run scraper first."
}
```

**Errores:**
- 401: `{"error": "Authentication required"}` - Token no proporcionado
- 401: `{"error": "Invalid or expired token"}` - Token inválido
- 500: `{"error": "Failed to fetch private data"}` - Error del servidor

---

### 4. Dashboard Público (Sin Autenticación)

#### GET /api/results - Obtener Datos Públicos del Dashboard

**Almacenamiento:** Este endpoint lee desde Netlify Blobs. Los datos son actualizados por el scraper y son compartidos entre Web y Android.

**Request:**
```http
GET /api/results HTTP/1.1
Host: your-dashboard.netlify.app
```

**Response Exitosa (200 OK):**
```json
{
  "timestamp": "2026-01-25T12:00:00.000Z",
  "results": {
    "youtube": {
      "success": true,
      "lastVideo": "2 weeks ago"
    },
    "twitter": {
      "success": true,
      "lastTweet": "5h",
      "totalTweets": "1,234"
    },
    "instagram": {
      "success": true,
      "lastPost": "523 posts, 1.2K followers"
    },
    "github": {
      "success": true,
      "version": "v1.2.3",
      "downloads": 456,
      "releaseDate": "2026-01-20T10:00:00.000Z"
    },
    "extensions": [
      {
        "name": "YouTube Only First Video",
        "extensionId": "nehhphibaeodomkkffididpjmlcigbdp",
        "success": true,
        "available": true,
        "functionalTest": false
      }
    ]
  }
}
```

**Nota:** Este endpoint NO incluye datos de criptomonedas. Para eso usar `/api/private/data` con autenticación.

---

#### POST /api/scrape - Actualizar Datos del Dashboard (Rate Limited)

**Descripción:** Ejecuta el scraper para actualizar los datos del dashboard (YouTube, Twitter, Instagram, GitHub, crypto, extensiones) y los guarda en Netlify Blobs.

**Rate Limit:** 1 request cada 5 minutos por IP.

**Request:**
```http
POST /api/scrape HTTP/1.1
Host: your-dashboard.netlify.app
```

**Response Exitosa (200 OK):**
```json
{
  "success": true,
  "timestamp": "2026-01-25T12:00:00.000Z",
  "results": {
    "youtube": {
      "success": true,
      "lastVideo": "2 weeks ago"
    },
    "twitter": {
      "success": true,
      "lastTweet": "5h",
      "totalTweets": "1,284"
    },
    "instagram": {
      "success": true,
      "lastPost": "60 posts, 30 followers"
    },
    "github": {
      "success": true,
      "version": "v1.5.0",
      "downloads": 16,
      "releaseDate": "2025-10-09T00:00:00.000Z"
    },
    "crypto": {
      "success": true,
      "btc": {
        "price": 85420.50,
        "change24h": 2.34
      },
      "sol": {
        "price": 145.67,
        "change24h": -1.23
      }
    },
    "extensions": [
      {
        "name": "YouTube Only First Video",
        "extensionId": "nehhphibaeodomkkffididpjmlcigbdp",
        "success": true,
        "available": true,
        "functionalTest": false
      }
    ]
  }
}
```

**Errores:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 429 | `{"error": "Please wait X seconds before running again"}` | Rate limit alcanzado |
| 500 | `{"error": "Unknown error"}` | Error del servidor al ejecutar scraper |

**Nota Importante:** Después de ejecutar este endpoint, los datos actualizados estarán disponibles inmediatamente en `/api/results` y `/api/private/data` gracias al almacenamiento centralizado en Netlify Blobs.

---

## 📏 Reglas de Negocio

### TODOs

| Regla | Valor |
|-------|-------|
| Máximo de TODOs por usuario | 200 |
| Longitud máxima del texto | 500 caracteres |
| Formato de ID | `timestamp-random` (ej: `1737800400000-a3k9m2x`) |
| Timestamps | ISO 8601 en UTC |
| Comportamiento de `completedAt` | Se establece automáticamente al marcar como completado |

### Autenticación

| Regla | Valor |
|-------|-------|
| Expiración del token | 30 minutos |
| Longitud del token | 64 caracteres (32 bytes hex) |
| Delay en login fallido | 1 segundo (anti brute-force) |
| Almacenamiento de tokens | In-memory (se pierden al reiniciar servidor) |

### Validaciones

**Texto de TODO:**
- No puede estar vacío (después de trim)
- Máximo 500 caracteres
- Se guarda con trim aplicado

**ID de TODO:**
- Debe existir en el sistema
- Formato string no vacío

---

## 📱 Ejemplos de Implementación Android

### Configuración Inicial

#### 1. Dependencias (build.gradle.kts)

```kotlin
dependencies {
    // Retrofit para HTTP
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")

    // OkHttp para logging
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // ViewModel y LiveData
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.6.2")

    // DataStore para almacenar token
    implementation("androidx.datastore:datastore-preferences:1.0.0")
}
```

#### 2. Modelos de Datos

```kotlin
// File: app/src/main/java/com/yourapp/models/Todo.kt
data class Todo(
    val id: String,
    val text: String,
    val completed: Boolean,
    val createdAt: String,
    val completedAt: String?
)

data class TodoListData(
    val todos: List<Todo>,
    val lastModified: String
)

// Requests
data class LoginRequest(val password: String)
data class CreateTodoRequest(val text: String)
data class UpdateTodoRequest(
    val id: String,
    val text: String? = null,
    val completed: Boolean? = null
)
data class DeleteTodoRequest(val id: String)

// Responses
data class LoginResponse(
    val success: Boolean,
    val token: String?,
    val expiresAt: Long?,
    val error: String?
)

data class ErrorResponse(val error: String)
data class DeleteResponse(val success: Boolean)
```

#### 3. API Interface con Retrofit

```kotlin
// File: app/src/main/java/com/yourapp/api/DashboardApi.kt
interface DashboardApi {

    @POST("api/auth/verify")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("api/todos")
    suspend fun getTodos(@Header("Authorization") token: String): Response<TodoListData>

    @POST("api/todos")
    suspend fun createTodo(
        @Header("Authorization") token: String,
        @Body request: CreateTodoRequest
    ): Response<Todo>

    @PUT("api/todos")
    suspend fun updateTodo(
        @Header("Authorization") token: String,
        @Body request: UpdateTodoRequest
    ): Response<Todo>

    @HTTP(method = "DELETE", path = "api/todos", hasBody = true)
    suspend fun deleteTodo(
        @Header("Authorization") token: String,
        @Body request: DeleteTodoRequest
    ): Response<DeleteResponse>

    @GET("api/private/data")
    suspend fun getPrivateData(@Header("Authorization") token: String): Response<CryptoData>

    @GET("api/results")
    suspend fun getPublicData(): Response<PublicDashboardData>
}
```

#### 4. Retrofit Client

```kotlin
// File: app/src/main/java/com/yourapp/api/RetrofitClient.kt
object RetrofitClient {
    private const val BASE_URL = "https://your-dashboard.netlify.app/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    val api: DashboardApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(DashboardApi::class.java)
    }
}
```

#### 5. Token Manager (DataStore)

```kotlin
// File: app/src/main/java/com/yourapp/auth/TokenManager.kt
class TokenManager(private val context: Context) {

    private val dataStore = context.dataStore

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("auth_token")
        private val EXPIRES_AT_KEY = longPreferencesKey("token_expires_at")

        private val Context.dataStore by preferencesDataStore("auth_prefs")
    }

    suspend fun saveToken(token: String, expiresAt: Long) {
        dataStore.edit { prefs ->
            prefs[TOKEN_KEY] = token
            prefs[EXPIRES_AT_KEY] = expiresAt
        }
    }

    suspend fun getToken(): String? {
        val prefs = dataStore.data.first()
        val token = prefs[TOKEN_KEY]
        val expiresAt = prefs[EXPIRES_AT_KEY] ?: return null

        // Check if token is expired
        if (System.currentTimeMillis() >= expiresAt) {
            clearToken()
            return null
        }

        return token
    }

    fun getTokenWithBearer(): String? {
        return runBlocking {
            getToken()?.let { "Bearer $it" }
        }
    }

    suspend fun clearToken() {
        dataStore.edit { prefs ->
            prefs.remove(TOKEN_KEY)
            prefs.remove(EXPIRES_AT_KEY)
        }
    }

    fun isTokenValid(): Flow<Boolean> = dataStore.data.map { prefs ->
        val expiresAt = prefs[EXPIRES_AT_KEY] ?: return@map false
        System.currentTimeMillis() < expiresAt
    }
}
```

#### 6. Repository

```kotlin
// File: app/src/main/java/com/yourapp/repository/DashboardRepository.kt
class DashboardRepository(
    private val api: DashboardApi,
    private val tokenManager: TokenManager
) {

    suspend fun login(password: String): Result<LoginResponse> {
        return try {
            val response = api.login(LoginRequest(password))
            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                if (loginResponse.success && loginResponse.token != null) {
                    tokenManager.saveToken(loginResponse.token, loginResponse.expiresAt!!)
                }
                Result.success(loginResponse)
            } else {
                Result.failure(Exception("Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTodos(): Result<TodoListData> {
        val token = tokenManager.getTokenWithBearer()
            ?: return Result.failure(Exception("Not authenticated"))

        return try {
            val response = api.getTodos(token)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                handleErrorResponse(response)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createTodo(text: String): Result<Todo> {
        val token = tokenManager.getTokenWithBearer()
            ?: return Result.failure(Exception("Not authenticated"))

        return try {
            val response = api.createTodo(token, CreateTodoRequest(text))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                handleErrorResponse(response)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateTodo(id: String, text: String? = null, completed: Boolean? = null): Result<Todo> {
        val token = tokenManager.getTokenWithBearer()
            ?: return Result.failure(Exception("Not authenticated"))

        return try {
            val response = api.updateTodo(token, UpdateTodoRequest(id, text, completed))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                handleErrorResponse(response)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteTodo(id: String): Result<Boolean> {
        val token = tokenManager.getTokenWithBearer()
            ?: return Result.failure(Exception("Not authenticated"))

        return try {
            val response = api.deleteTodo(token, DeleteTodoRequest(id))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(true)
            } else {
                handleErrorResponse(response)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        tokenManager.clearToken()
    }

    private fun <T> handleErrorResponse(response: Response<T>): Result<T> {
        return when (response.code()) {
            401 -> Result.failure(Exception("Session expired. Please login again."))
            404 -> Result.failure(Exception("Resource not found"))
            400 -> Result.failure(Exception("Invalid request"))
            500 -> Result.failure(Exception("Server error"))
            else -> Result.failure(Exception("Unknown error: ${response.code()}"))
        }
    }
}
```

#### 7. ViewModel Ejemplo

```kotlin
// File: app/src/main/java/com/yourapp/viewmodel/TodoViewModel.kt
class TodoViewModel(
    private val repository: DashboardRepository
) : ViewModel() {

    private val _todos = MutableLiveData<List<Todo>>()
    val todos: LiveData<List<Todo>> = _todos

    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun loadTodos() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null

            repository.getTodos()
                .onSuccess { data ->
                    _todos.value = data.todos
                }
                .onFailure { e ->
                    _error.value = e.message
                }

            _loading.value = false
        }
    }

    fun createTodo(text: String) {
        if (text.isBlank()) {
            _error.value = "Text cannot be empty"
            return
        }

        if (text.length > 500) {
            _error.value = "Text too long (max 500 characters)"
            return
        }

        viewModelScope.launch {
            _loading.value = true
            _error.value = null

            repository.createTodo(text)
                .onSuccess {
                    loadTodos() // Refresh list
                }
                .onFailure { e ->
                    _error.value = e.message
                }

            _loading.value = false
        }
    }

    fun toggleTodoCompleted(todo: Todo) {
        viewModelScope.launch {
            repository.updateTodo(todo.id, completed = !todo.completed)
                .onSuccess {
                    loadTodos() // Refresh list
                }
                .onFailure { e ->
                    _error.value = e.message
                }
        }
    }

    fun deleteTodo(todoId: String) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null

            repository.deleteTodo(todoId)
                .onSuccess {
                    loadTodos() // Refresh list
                }
                .onFailure { e ->
                    _error.value = e.message
                }

            _loading.value = false
        }
    }
}
```

---

## ⚠️ Manejo de Errores

### Códigos HTTP Comunes

| Código | Significado | Acción Recomendada |
|--------|-------------|-------------------|
| 200 | OK | Procesar respuesta exitosa |
| 201 | Created | Recurso creado exitosamente |
| 400 | Bad Request | Mostrar error de validación al usuario |
| 401 | Unauthorized | Redirigir a login, limpiar token |
| 404 | Not Found | Recurso no existe, actualizar UI |
| 429 | Too Many Requests | Mostrar mensaje de rate limit |
| 500 | Internal Server Error | Mostrar error genérico, reintentar |

### Estrategias de Retry

```kotlin
suspend fun <T> retryOperation(
    times: Int = 3,
    delayMillis: Long = 1000,
    operation: suspend () -> Result<T>
): Result<T> {
    repeat(times - 1) {
        val result = operation()
        if (result.isSuccess) return result
        delay(delayMillis)
    }
    return operation() // Last attempt
}
```

### Manejo de Expiración de Token

```kotlin
// En tu Activity/Fragment
lifecycleScope.launch {
    tokenManager.isTokenValid().collect { isValid ->
        if (!isValid && currentRoute != "login") {
            // Redirigir a login
            navigateToLogin()
        }
    }
}
```

---

## 🔒 Seguridad y Mejores Prácticas

### Almacenamiento del Token

**NUNCA guardes el token en:**
- SharedPreferences sin encriptar
- Variables estáticas
- Logs

**SÍ guarda el token en:**
- EncryptedSharedPreferences
- DataStore con EncryptedFile
- Android Keystore (para máxima seguridad)

**Ejemplo con EncryptedSharedPreferences:**

```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val encryptedPrefs = EncryptedSharedPreferences.create(
    context,
    "secure_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
```

### HTTPS Enforcement

Asegúrate de que todas las peticiones usen HTTPS:

```kotlin
// En network_security_config.xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">your-dashboard.netlify.app</domain>
    </domain-config>
</network-security-config>
```

### Validación del Lado del Cliente

Antes de enviar requests, valida:

```kotlin
fun validateTodoText(text: String): String? {
    return when {
        text.isBlank() -> "Text cannot be empty"
        text.length > 500 -> "Text too long (max 500 characters)"
        else -> null // Valid
    }
}
```

### Logging Seguro

```kotlin
// Nunca loguees tokens en producción
if (BuildConfig.DEBUG) {
    Log.d("API", "Token: $token")
}

// Mejor: usa interceptor que filtre datos sensibles
class SafeLoggingInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
        val request = chain.request()
        val sanitizedHeaders = request.headers.newBuilder()
            .removeAll("Authorization")
            .add("Authorization", "Bearer ***")
            .build()

        // Log sanitized request
        return chain.proceed(request)
    }
}
```

---

## 🧪 Testing y Debugging

### Testing Endpoints con cURL

```bash
# Login
curl -X POST https://your-dashboard.netlify.app/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'

# Get TODOs
curl -X GET https://your-dashboard.netlify.app/api/todos \
  -H "Authorization: Bearer your-token-here"

# Create TODO
curl -X POST https://your-dashboard.netlify.app/api/todos \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test TODO from Android"}'

# Update TODO
curl -X PUT https://your-dashboard.netlify.app/api/todos \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"id":"1737800400000-a3k9m2x","completed":true}'

# Delete TODO
curl -X DELETE https://your-dashboard.netlify.app/api/todos \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"id":"1737800400000-a3k9m2x"}'
```

### Debugging en Android Studio

1. **Network Profiler:** Usa Android Studio Network Profiler para ver requests/responses
2. **OkHttp Logging:** Ya configurado en los ejemplos anteriores
3. **Breakpoints:** Pon breakpoints en `onSuccess` y `onFailure` callbacks

### Testing Unitario

```kotlin
@Test
fun `validate todo text length`() {
    val validText = "a".repeat(500)
    assertNull(validateTodoText(validText))

    val invalidText = "a".repeat(501)
    assertNotNull(validateTodoText(invalidText))
}

@Test
fun `token expiration check`() = runTest {
    val tokenManager = TokenManager(context)
    val expiredTime = System.currentTimeMillis() - 1000

    tokenManager.saveToken("test-token", expiredTime)

    val token = tokenManager.getToken()
    assertNull(token) // Should be null because expired
}
```

---

## 📝 Checklist de Implementación

### Fase 1: Setup Inicial
- [ ] Añadir dependencias Retrofit, OkHttp, Coroutines
- [ ] Crear modelos de datos (Todo, LoginRequest, etc.)
- [ ] Configurar RetrofitClient con BASE_URL
- [ ] Implementar TokenManager con DataStore
- [ ] Configurar network_security_config.xml

### Fase 2: Autenticación
- [ ] Crear pantalla de login
- [ ] Implementar llamada a `/api/auth/verify`
- [ ] Guardar token de forma segura
- [ ] Implementar logout
- [ ] Manejar expiración de token

### Fase 3: TODOs
- [ ] Crear pantalla de lista de TODOs
- [ ] Implementar GET `/api/todos`
- [ ] Implementar POST `/api/todos` (crear)
- [ ] Implementar PUT `/api/todos` (actualizar)
- [ ] Implementar DELETE `/api/todos` (eliminar)
- [ ] Añadir swipe-to-delete
- [ ] Añadir pull-to-refresh

### Fase 4: Dashboard
- [ ] Implementar GET `/api/results` para datos públicos (YouTube, Twitter, Instagram, GitHub, extensiones)
- [ ] Implementar GET `/api/private/data` para crypto
- [ ] Mostrar estado de aplicaciones (operacional, último video/tweet/post, etc.)
- [ ] Mostrar precios de BTC y SOL
- [ ] Mostrar cambios 24h con colores (verde/rojo)
- [ ] Implementar refresh automático cada X minutos
- [ ] Opcional: Implementar POST `/api/scrape` para actualizar datos manualmente (rate limited)

### Fase 5: UX/UI
- [ ] Loading states
- [ ] Error handling con Snackbar/Toast
- [ ] Empty states
- [ ] Animaciones
- [ ] Dark mode support

### Fase 6: Testing
- [ ] Unit tests para validaciones
- [ ] Integration tests para Repository
- [ ] UI tests para flujos principales
- [ ] Probar con red lenta/sin conexión

---

## 🚀 Próximos Pasos

1. **Copia este documento** al proyecto Android
2. **Actualiza BASE_URL** con la URL real de Netlify
3. **Sigue el checklist** de implementación paso a paso
4. **Prueba cada endpoint** antes de integrar en la UI
5. **Implementa manejo de errores robusto** desde el inicio

---

## 📞 Soporte

Si encuentras errores o inconsistencias en la API:
- Verifica que el backend esté desplegado correctamente en Netlify
- Revisa los logs del servidor en Netlify Dashboard
- Asegúrate de que la variable `PRIVATE_PASSWORD_HASH` esté configurada

**Repositorio del Backend:** Dashboard2 (Next.js 16)
**Versión del Documento:** 1.0
**Última Actualización:** 2026-01-25
