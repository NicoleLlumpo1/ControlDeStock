# Sistema de Control de Mercadería por Talle

Este proyecto es una aplicación web para gestionar el stock de indumentaria y accesorios, con control por talle, alertas de stock crítico y estadísticas de ventas.  
Funciona íntegramente en el navegador utilizando **localStorage**, sin necesidad de servidor ni base de datos externa.

---

## Funcionalidades principales

### Stock
- Tarjetas con imagen, categoría y chips por talle.
- Filtros por nombre, categoría y talle.
- Registro de ventas tocando un talle y cargando la cantidad.

### Alertas
- Aviso emergente cuando un talle queda en **1 unidad**.
- Banner rojo superior con todos los talles críticos.
- Colores de estado:
  - 🔴 Rojo → stock crítico (1)
  - 🟡 Amarillo → stock bajo (2–3)
  - ⚪ Gris → agotado

### Reporte
- Tabla con stock por producto y talle.
- Exportación a **CSV**.

### Ventas
- Historial con fecha, producto, talle y cantidad.

### Administrar
- Alta, edición y baja de productos.
- Campos: nombre, categoría, imagen.
- Carga de talles con un clic:
  - 2–14
  - S–XXXL
  - Talle único
  - Talle personalizado
- Stock inicial configurable.
- Datos de ejemplo precargados (chomba naranja + 2 productos más).

### Estadísticas
- Ranking de productos más vendidos.
- Ranking de talles más vendidos.
- Reporte combinado: producto+talle más vendido.
- Evolución mensual de ventas.
- Gráficos dinámicos con **Chart.js**.

---

## Tecnologías utilizadas
- **Frontend:** HTML, CSS, JavaScript
- **Almacenamiento:** localStorage
- **Exportación:** CSV generado en cliente

---

## Consideraciones
- Los datos se guardan en el **navegador** del dispositivo, no se comparten entre equipos.
- Las alertas son **avisos dentro de la web**, no emails.
- Las imágenes se reducen y se guardan en localStorage. Si se cargan muchas, puede llenarse el almacenamiento.

---

## Estado del proyecto
Versión inicial (MVP) con módulos de stock, alertas, reportes, ventas, administración y estadísticas.  
Se pueden cargar productos de ejemplo para probar el flujo completo.

---

## Objetivo
Facilitar el control de mercadería en indumentaria, optimizando la gestión de stock por talle y brindando información útil para la toma de decisiones.

---

## Contacto
Desarrollado por **Nicole Llumpo **  
Estudiante de Ingeniería en Sistemas de Información  
[LinkedIn](https://www.linkedin.com) | [Email](nicolellumpo1@gmail.com.com)
