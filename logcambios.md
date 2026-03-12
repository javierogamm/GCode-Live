# Log de cambios

## v1.3.68 - 2026-03-12
- Se corrigió la sincronización con `Process_Flows` para escribir el payload en la columna correcta `flow` (antes se intentaba usar `json`, que no existe en esa tabla).
- El endpoint `api/process-flows` mantiene el flujo de logs y ahora registra explícitamente que consolida plantillas en la columna `flow`.
- Se actualizó la versión visible de la app a `v1.3.68` y la versión del proyecto en `package.json` a `1.3.68`.

## v1.3.67 - 2026-03-12
- Se reforzó la sincronización de plantillas para insertar/crear estructura en el JSON del flow: además de `plantillas`, ahora se consolida `fichaProyecto.plantillas` y se actualizan campos de nodo (`plantillaTexto` y `data.plantilla` cuando aplica).
- Se añadió trazabilidad de intentos y errores de sincronización con un log persistente en navegador (`localStorage`, clave `gcSyncLog`) y helper `window.getSyncLog()` para revisión de causas.
- El endpoint `api/process-flows` ahora devuelve `logs` detallados por etapa (inicio, cálculo de `sync_code`, parches en tablas y errores) para facilitar diagnóstico de fallos en producción.
- Se mejoró el manejo de errores en frontend mostrando el detalle real devuelto por API durante vinculación/sincronización en lugar de un mensaje genérico.
- Se actualizó la versión visible de la app a `v1.3.67` y la versión del proyecto en `package.json` a `1.3.67`.

## v1.3.66 - 2026-03-12
- Se corrigió la acción del botón **"Sincronizar Code"** para evitar el error al invocar `api/process-flows`, usando una ruta compatible por `POST` en lugar de depender solo de `PATCH`.
- La sincronización ahora puede resolver el flow por `sync_code` cuando no existe `linked_flow_id` en memoria (por ejemplo, tras recargar/cargar proyecto), evitando bloqueos por vínculo parcial.
- El endpoint `api/process-flows` ahora acepta `POST` además de `PATCH` para vinculación/sincronización y permite filtrar por `sync_code` en `GET`.
- Se actualizó la versión visible de la app a `v1.3.66` y la versión del proyecto en `package.json` a `1.3.66`.

## v1.3.65 - 2026-03-12
- Se implementó el vínculo técnico por `sync_code` entre `Code_Markdowns`, `Code_Markdowns_BACKUP` y `Process_Flows` al vincular un proyecto con un flow.
- La vinculación ahora asigna (o reutiliza) un código correlativo común y lo consolida en las tres tablas para mantener enlazados proyecto, flow e histórico de backups.
- Se añadió el botón lateral **"Sincronizar Code"** para proyectos ya vinculados: envía manualmente al flow las plantillas Markdown actuales de Code y actualiza `plantillas` del JSON del flow sin sincronización automática.
- Se ampliaron los endpoints para exponer y persistir `sync_code` en proyectos y para soportar sincronización/vinculación vía `PATCH /api/process-flows`.
- Se actualizó la versión visible de la app a `v1.3.65` y la versión del proyecto en `package.json` a `1.3.65`.

## v1.3.64 - 2026-03-12
- Se corrigió la vinculación de Process para aceptar más formatos de payload del flow y evitar falsos "JSON inválido" cuando el contenido no llega en `json` sino en otras columnas (como `flow`, `data`, `payload`, etc.).
- El extractor ahora intenta parseo robusto de cadenas (incluyendo recorte al bloque `{...}` cuando hay texto envolvente) y valida por estructura (`nodos`, `plantillas`, `conexiones` o `fichaProyecto`).
- Se ajustó el nombre mostrado del flow para priorizar la columna **`nombre`**, tal y como se usa en la tabla hermana.
- Se actualizó la versión visible de la app a `v1.3.64` y la versión del proyecto en `package.json` a `1.3.64`.

## v1.3.63 - 2026-03-12
- Se añadió el nuevo botón lateral **"Vincular proyecto process"** para iniciar la vinculación de plantillas desde la app hermana de flujos.
- Se implementó un nuevo modal de vinculación (similar al de carga) que lista carpetas por **subfunción** desde la tabla `Process_Flows` y permite seleccionar un flow para vincular.
- Al vincular un flow, la app crea automáticamente una plantilla por cada nodo de tipo **formulario** o **documento**, usando el título del nodo como nombre y cargando su Markdown desde `plantillas[nodo.id]` o `nodo.plantillaTexto`.
- Se añadieron los endpoints `GET /api/process-subfunciones` y `GET /api/process-flows` para consultar subfunciones y registros de `Process_Flows`.
- Se actualizó la versión visible de la app a `v1.3.63` y la versión del proyecto en `package.json` a `1.3.63`.

## v1.3.62 - 2026-03-12
- Se reorganizó el panel izquierdo eliminando los botones **Nuevo**, **Pegar** y **Exportar CSV**.
- Se renombraron los botones de proyecto a **Exportar JSON** e **Importar JSON**.
- En **Validar tesauros configurados** se añadió un icono `?` a la derecha con tooltip explicativo sobre el copypaste desde Gestiona y la validación/coincidencia de valores en tesauros selector.
- Se actualizó la versión visible de la app a `v1.3.62` y la versión del proyecto en `package.json` a `1.3.62`.

## v1.3.61 - 2026-03-12
- El botón **Restaurar** del historial ahora consolida la restauración como una **nueva iteración guardada** del proyecto activo (sobrescritura controlada) antes de cargarla en el editor.
- Tras restaurar, se cierra el modal de historial, se vuelve al modal de carga y se muestra el aviso **"Versión restaurada."**.
- Se mantiene la carga directa de la versión restaurada en el editor para continuar trabajando desde ese estado ya consolidado.
- Se actualizó la versión visible de la app a `v1.3.61` y la versión del proyecto en `package.json` a `1.3.61`.

## v1.3.60 - 2026-03-12
- En el modal de guardar se recupera el flujo de **sobrescribir por defecto** cuando el proyecto activo/cargado coincide y pertenece al usuario, mostrando confirmación previa.
- Si en la confirmación se cancela la sobrescritura, el guardado continúa automáticamente como **copia** (con nombre sugerido único `copia`, `copia 2`, etc.).
- Se añade botón explícito **Guardar copia** en el modal para forzar guardado derivado en cualquier momento.
- Se actualizó la versión visible de la app a `v1.3.60` y la versión del proyecto en `package.json` a `1.3.60`.

## v1.3.59 - 2026-03-12
- Se reforzó el flujo de guardado: al abrir el modal de guardar se prioriza el proyecto activo/cargado y el botón principal pasa a **Guardar copia** para crear un nuevo registro derivado (nuevo proyecto activo).
- Se eliminó la opción de sobrescribir desde el modal de carga y se añadió un botón **Historial** por proyecto para consultar versiones en backup.
- Se añadió confirmación nativa del navegador al intentar salir/cambiar de URL con cambios sin guardar (`beforeunload`).
- Se implementó el histórico en backend con nueva ruta `GET /api/project-history` leyendo `Code_Markdowns_BACKUP` por `ID_Origen`.
- En cada guardado/sobrescritura de `Code_Markdowns`, el backend replica una versión en `Code_Markdowns_BACKUP` con `fecha_guardado` e `ID_Origen`.
- Se actualizó la versión visible de la app a `v1.3.59` y la versión del proyecto en `package.json` a `1.3.59`.

## v1.3.58 - 2026-02-17
- En la validación de tesauros configurados, la consolidación final ahora **solo** crea/actualiza tesauros del copypaste que sean coincidentes por referencia con los detectados en el proyecto.
- Los tesauros coincidentes se consolidan con las características del copypaste (nombre, tipo, momento y agrupación), dejando fuera los no coincidentes.
- Si un tesauro coincidente es de tipo selector, ahora es obligatorio completar su copypaste de valores antes de poder aplicar la validación.
- Se actualizó la versión visible de la app a `v1.3.58` y la versión del proyecto en `package.json` a `1.3.58`.

## v1.3.57 - 2026-02-17
- En la validación de tesauros configurados, la consolidación final ahora incorpora **todos los tesauros del copypaste** al proyecto: actualiza por referencia si ya existen y crea los que faltan, para selectores y demás tipologías.
- Si hay coincidencias de referencia de tipo selector, el flujo sigue solicitando el copypaste de sus valores antes de la fase final y usa esos valores en la consolidación.
- Se actualizó la versión visible de la app a `v1.3.57`.

## v1.3.56 - 2026-02-17
- Se corrigió la validación de tesauros configurados para detectar coincidencias **por referencia** aunque nombre/tipo difieran.
- El paso de revisión ahora distingue entre coincidencia completa (referencia+nombre+tipo) y coincidencia solo por referencia para evitar falsos negativos.
- Al aplicar la validación se actualizan también `momento` y `agrupacion` desde el copypaste para los tesauros coincidentes por referencia, y en selectores se mantienen los valores validados del paso 4.

## v1.3.55 - 2026-02-17
- Se añadió el botón lateral **"Validar tesauros configurados"** debajo de Exportar CSV para abrir un flujo dedicado de validación.
- El nuevo modal (ancho) detecta tesauros en **todos los markdowns/plantillas del proyecto**, los muestra en tabla y solicita el copypaste para cruzar coincidencias por referencia, nombre y tipo.
- Si hay coincidencias de tipo selector, el flujo pide el pegado de valores por selector, valida sus referencias/valores y consolida el resultado.
- Al confirmar, se actualizan en el proyecto los tesauros coincidentes (nombre/tipo) y los valores de selector capturados desde el copypaste.

## v1.3.54 - 2026-02-13
- Se registra `ultimo_acceso_code` también cuando la sesión se restaura desde almacenamiento local (cookie/cache del navegador), sin requerir login manual.
- `AuthManager` ahora notifica al backend en la restauración de sesión para consolidar el último acceso y guardar la fecha actualizada en `localStorage`.
- El endpoint `PATCH /api/users` admite la bandera `touchAccess` para actualizar únicamente `ultimo_acceso_code` y devolverlo en la respuesta.

## v1.3.53 - 2026-02-13
- Se actualiza automáticamente la columna `ultimo_acceso_code` en la tabla `users` al iniciar sesión en la app.
- El endpoint de login devuelve el usuario con la fecha de último acceso consolidada en la misma respuesta.

## v1.3.52 - 2026-02-13
- Al guardar un proyecto cargado desde BDD ahora se pregunta primero si se desea sobrescribir; si se rechaza, se propone guardar como nuevo proyecto con nombre editable.
- Se añadió una barra sobre el editor para ver y editar en cualquier momento el nombre y tipo de la plantilla activa.
- Las plantillas ahora guardan tipo (`Formulario` o `Documento`) desde su creación y ese tipo se exporta/importa en JSON.
- El guardado en BDD concatena la columna `Plantilla` con formato `Nombre (Tipo)` para cada plantilla del proyecto.

## v1.3.51 - 2026-02-10
- Se añadieron acciones de sobrescribir y eliminar en los modales de Guardar y Cargar proyectos con confirmación previa.
- Sobrescribir y eliminar solo se habilitan al creador del registro; el backend ahora valida propiedad para impedir operaciones por terceros.
- Al sobrescribir desde Guardar, la actualización se confirma y el modal se cierra automáticamente.

## v1.3.50 - 2026-02-10
- El paso final del importador desde Markdown ahora guarda en el gestor todos los tesauros detectados en el Markdown, incluso si no vienen del copypaste.
- Se ajustó el cierre del wizard para mostrar el total importado/actualizado desde Markdown y mantener opciones de selector cuando existan.

## v1.3.49 - 2026-02-10
- El paso 2 del importador de tesauros desde Markdown ahora incluye el botón "Saltar" para continuar el flujo sin pegar copypaste.
- Al saltar ese paso se construye la lista combinada con valores por defecto y se permite seguir hasta la confirmación final.

## v1.3.48 - 2026-02-10
- La detección de tesauros al importar desde Markdown ahora reconoce bloques con atributos adicionales como `language` y `editable: false`.
- Si un mismo tesauro aparece varias veces en el Markdown por idioma, se consolida en una sola referencia importable.

## v1.3.47 - 2026-03-09
- La validación de sections ahora acepta valores con espacios dentro de comillas dobles sin marcarlos como error.

## v1.3.46 - 2025-03-08
- El modal de carga ahora replica el flujo de carpetas del guardado y muestra el mensaje correcto si fallan las subfunciones.

## v1.3.45 - 2025-03-08
- Se añadió el botón Cargar debajo de Guardar para abrir un modal con carpetas y proyectos guardados.
- El modal de carga muestra autor y fecha de guardado y permite cargar el proyecto completo desde la BDD.

## v1.3.44 - 2026-03-04
- El guardado en base de datos ahora persiste una sola fila por proyecto con el JSON completo, plantillas concatenadas, usuario y carpeta (subfunción).
- El modal de guardado muestra las subfunciones existentes como carpetas y permite definir una nueva carpeta al guardar.
- Se ajustaron los endpoints de proyectos para trabajar con el nuevo schema y actualizar filas existentes por proyecto.

## v1.3.43 - 2026-03-03
- Se añadió un campo editable para el nombre del proyecto en el área principal del editor.
- Se incorporaron botones y modal para seleccionar o crear plantillas dentro del proyecto.
- La exportación e importación JSON ahora incluye nombre del proyecto y múltiples plantillas compartiendo tesauros.
- El guardado en base de datos registra cada plantilla como fila asociada al nombre del proyecto.

## v1.3.42 - 2026-03-02
- Los números de línea ahora permiten seleccionar la línea completa al hacer clic y extender la selección al arrastrar.
- El gutter de números de línea acepta interacción directa para facilitar la selección por rangos.

## v1.3.41 - 2026-02-06
- El minimapa se activa por defecto y sincroniza su estado con el botón de miniatura.
- El resaltado de errores ahora marca en rojo tesauros, LET y definitions mal configurados, además de detectar etiquetas de sección mal escritas.
- La validación de sections ignora espacios y marca errores por palabras fijas mal escritas, paréntesis o comillas faltantes, con excepción de valores `null` sin comillas.

## v1.3.40 - 2026-02-06
- El resaltado de referencias seleccionadas ahora se aplica también a bloques de tesauros, LET y definitions para que se vean en el canvas principal.
- Las iteraciones de referencias tipo tesauro ahora resaltan también en representaciones inline y en bloques definition.

## v1.3.39 - 2026-03-02
- El minimapa ahora se puede arrastrar libremente por la pantalla y redimensionar desde su esquina inferior derecha.
- El recuadro visible del minimapa permite arrastrarse para desplazar el editor principal en vertical.

## v1.3.38 - 2026-03-02
- El importador desde Markdown ahora solo crea tesauros que coinciden entre el Markdown y el copypaste.

## v1.3.37 - 2026-03-02
- El flujo de importación desde Markdown ahora obliga a continuar con el copypaste de tesauros para cruzar coincidencias.
- La captura de referencias y valores solo se solicita para los selectores que coinciden con el copypaste y el Markdown.

## v1.3.36 - 2026-03-01
- Se añadió el paso 4 en la importación desde Markdown para capturar uno a uno los valores de selectores detectados.

## v1.3.35 - 2026-03-01
- En la revisión de importación desde Markdown se ordenan primero los tesauros coincidentes y se resaltan en verde, dejando los no coincidentes en gris.
- El paso de selección de valores ahora solo solicita selectores que aparecen en el Markdown.

## v1.3.34 - 2026-03-01
- Se rediseñó el flujo de importación de tesauros desde Markdown con detección inicial, confirmación de copypaste, revisión en tabla y configuración guiada de selectores antes de confirmar.

## v1.3.33 - 2026-02-28
- Se recuperó el resaltado de referencias coincidentes dentro de la miniatura y se hizo más visible en su escala.
- La miniatura ahora muestra la ventana visible del editor y aumentó su tamaño en un 50%.
- Las líneas de fondo del minimapa se suavizaron para verse más sutiles.

## v1.3.32 - 2026-02-28
- Se ajustó la miniatura para representar en miniatura el overlay real del editor, con líneas finas negras sobre fondo blanco.
- El minimapa ahora respeta los toggles de resaltado y refleja las iteraciones de la referencia seleccionada.

## v1.3.31 - 2026-02-28
- Se añadió el resaltado de referencias seleccionadas (sections, tesauros y LET) para localizar todas sus iteraciones en el texto.
- Se incorporó un toggle de miniatura con minimapa flotante que muestra líneas, bloques de toggle y las referencias resaltadas.

## v1.3.30 - 2026-02-27
- Se añadió scroll vertical al modal de doble columna multipárrafo para manejar listas largas de párrafos sin perder la barra de acciones.

## v1.3.29 - 2026-02-27
- Se añadió el botón "Doble columna multipárrafo" para gestionar bloques de doble columna en múltiples párrafos desde un solo modal.
- El nuevo modal multipárrafo detecta varios bloques/paragraphs de doble columna, los separa por fila y permite aplicar idioma por columna en lote.

## v1.3.28 - 2026-02-26
- Se incorporó un login basado en la tabla `users` para bloquear el editor hasta autenticar al usuario.
- Se añadió un acordeón de usuario en el panel izquierdo con estado visual y edición de nombre/contraseña.
- Se agregó un endpoint API para validar credenciales y actualizar datos del usuario desde la interfaz.

## v1.3.27 - 2026-02-25
- Se añadió el botón "Guardar proyecto" con modal para organizar flujos por subfunción y asignar nombre antes de guardar.
- Se incorporó la integración con Supabase para listar subfunciones, consultar flujos y almacenar el JSON del proyecto.

## v1.3.26 - 2026-02-24
- El gestor de tesauros ahora importa tesauros desde copypaste, incluyendo el flujo de configuración de selectores.

## v1.3.25 - 2026-02-03
- Se aceptan espacios opcionales entre `condition`, `:` y `(` en la validación de secciones para evitar falsos positivos.

## v1.3.24 - 2026-02-22
- Se aseguró el resaltado de columnas y splits incluso cuando dentro hay secciones, tesauros o LET.
- Se añadió un nuevo overlay para datos de tipo función con color verde oscuro.
- Los datos de función ahora reciben el atributo `language` al trabajar en columnas, igual que los tesauros.

## v1.3.23 - 2026-02-22
- Al cambiar el idioma de una columna en el modal de doble columna, se actualiza el código de idioma de los tesauros existentes en esa columna.

## v1.3.22 - 2026-02-22
- Se duplicó el tamaño del modal de doble columna para mejorar la claridad de edición.
- El modal de doble columna ahora permite definir un idioma por columna y añade la etiqueta `language` al pegar tesauros.

## v1.3.21 - 2026-02-21
- Se añadió un botón para duplicar tesauros en el gestor, generando nombre y referencia con sufijo "2".
- Las referencias de tesauros ahora se limitan a 40 caracteres en edición e importaciones.
- Se incorporaron botones de deshacer y rehacer cambios dentro del gestor de tesauros.
- Los tres botones de importación del gestor de tesauros ahora comparten el mismo color.

## v1.3.20 - 2026-02-20
- Los modales de creación de tesauros muestran la referencia generada cuando se elige "Sí" para crearla, permitiendo revisarla antes de insertar.

## v1.3.19 - 2026-02-20
- El modal rápido de creación de tesauros pregunta si debe crear la referencia y deja de sugerirla automáticamente mientras se escribe.

## v1.3.18 - 2026-02-20
- El gestor de tesauros ahora permite crear tesauros sin sugerencia automática de referencia y ofrece un selector para generar la referencia al crear uno individual.
- Se añadió el icono de rueda dentada junto a la referencia en el listado para sugerir la referencia en Camel Case bajo demanda.

## v1.3.17 - 2026-01-20
- Se ajustó el resaltado para que los bloques de tesauros, secciones y utilidades rompan líneas igual que el textarea y eviten desajustes del overlay.

## v1.3.16 - 2026-01-15
- El modal de doble columna ahora detecta el bloque completo cuando el cursor o la selección están dentro, cargando cada columna en su campo correspondiente.

## v1.3.15 - 2026-01-15
- Se añadió un botón para intercambiar el contenido de las columnas en el modal de doble columna.

## v1.3.14 - 2026-01-08
- Se calcularon los números de línea en base a las líneas visuales para mantenerlos visibles cuando hay saltos automáticos por ajuste de texto.

## v1.3.13 - 2025-03-05
- Se corrigió el scroll de los números de línea para que no se recorten en la parte inferior.

## v1.3.12 - 2025-03-05
- Se sincronizó el desplazamiento de los números de línea con el overlay del editor.

## v1.3.11 - 2025-03-05
- Se ajustó el ancho del gutter para alinear los overlays de resaltado con el texto del editor.

## v1.3.10 - 2025-03-05
- Se añadieron números de línea como overlay sin modificar el layout del editor.
- Se mantuvo el textarea original, ajustando únicamente el padding interno para respetar el gutter.

## v1.3.9 - 2025-03-05
- Se añadió un panel de números de línea sincronizado con el editor Markdown.
- El área de edición ahora integra un contenedor con gutter para mantener alineado el contenido y el resaltado.

## v1.3.8 - 2025-12-29
- El modal de doble columna mantiene el texto seleccionado sin recortes al abrirse desde el botón.
- Se evitó cerrar el modal de doble columna al hacer click fuera de él.

## v1.3.7 - 2025-12-22
- Se añadió un menú contextual al hacer click derecho sobre texto seleccionado para convertirlo en bloque de doble columna.
- El modal de doble columna ahora se abre desde el menú contextual precargando la selección en la columna izquierda.

## v1.3.6 - 2025-12-10
- Se añadió el botón de doble columna con modal amplio para componer columnas izquierda y derecha en sintaxis Gestiona Code.
- Se incorporó el resaltado de columnas con colores propios y un toggle dedicado para mostrar/ocultar el bloque.
- Se mostró la versión de la app en la interfaz principal.

## v1.3.5 - 2025-12-02
- Se revierte el recorrido de inserción de tesauros y el botón secundario asociado en el modal de inicio, dejando el tutorial únicamente con el flujo principal previo.

## v1.2.2 - 2024-06-16
- Se ampliaron los modales de LET y Sections para ofrecer más espacio de trabajo y se ajustaron sus controles para ocupar el ancho disponible.

## v1.2.1 - 2024-06-15
- El selector de referencia del modal LET muestra las variables creadas al elegir "Variable" como destino y permite reutilizarlas directamente.

## v1.2.0 - 2024-06-14
- El generador LET permite elegir si la referencia destino es un tesauro (`personalized.*`) o una variable (`variable.*`), conservando los atajos numéricos para variables definidas.
- En la creación de secciones, el comparador por defecto en los desplegables de condición pasa a ser "==" (igual a).

## v1.1.0 - 2024-06-13
- Se limita la generación automática de referencias de tesauros a un máximo de 40 caracteres en todas las rutas de creación y sugerencias.
- Se añade al Gestor de Tesauros la importación desde archivos CSV exportados (Tesauro.csv obligatorio, Tesauro_Valores.csv y Vinculacion_Tesauros.csv opcionales).
