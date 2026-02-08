# Stack tecnológico de la app

## Lenguajes y estándares
- **HTML5** para la estructura del editor.
- **CSS3** para estilos, layout y utilidades visuales.
- **JavaScript (ES6)** para la lógica del editor en el navegador.
- **Node.js** para endpoints API (archivos en `api/`).

## Librerías y dependencias
- **Jest** para pruebas automatizadas.
- **JSDOM** para simular DOM en los tests.

## Servicios y plataformas externas
- **Supabase (REST API)** como backend de datos, consumido mediante `fetch` con credenciales vía variables de entorno.

## APIs y utilidades del navegador
- **Fetch API** para las llamadas HTTP desde el front-end y la capa API.
- **DOM API** para manipulación de la interfaz y eventos del editor.
