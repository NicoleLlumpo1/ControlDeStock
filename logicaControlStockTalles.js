/* ==========================================================
   CONTROL DE STOCK POR TALLE - Club de Rugby Ezeiza
   Los datos se guardan en el navegador (localStorage).
   ========================================================== */

/* ===== CONSTANTES Y ESTADO GENERAL ===== */
const CLAVE_ALMACENAMIENTO = "stockTallesClubRugbyEzeiza";
const TALLES_NUMERICOS = ["2", "4", "6", "8", "10", "12", "14"];
const TALLES_EN_LETRAS = ["S", "M", "L", "XL", "XXL", "XXXL"];
const LOGO_DEL_CLUB = "__LOGO_DEL_CLUB__";
const NOMBRE_APLICACION = "Control de stock por talle";
const DIAS_VENTANA_ROTACION = 60;
const MILISEGUNDOS_POR_DIA = 86400000;

let baseDeDatos = { productos: [], ventas: [], configuracion: null };
let pestanaActiva = "stock";
let borradorProducto = null;
let ventaEnCurso = null;
const filtrosListado = { texto: "", categoria: "", talle: "" };

/* ===== UTILIDADES ===== */
function seleccionar(selectorCss) { return document.querySelector(selectorCss); }

function escaparHtml(texto) {
  const reemplazos = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(texto).replace(/[&<>"']/g, caracter => reemplazos[caracter]);
}

function crearTalle(talle, stock) { return { talle, stock }; }

function sumarStockDeProducto(producto) {
  return producto.talles.reduce((total, talle) => total + talle.stock, 0);
}

function clasificarEstadoDeStock(stock) {
  if (stock === 0) return "Agotado";
  if (stock === 1) return "Critico";
  if (stock <= 3) return "Bajo";
  return "Normal";
}

function obtenerCategoriasExistentes() {
  const categoriasBase = ["Indumentaria", "Accesorios", "Bolsos"];
  return [...new Set([...categoriasBase, ...baseDeDatos.productos.map(producto => producto.categoria)])];
}

function buscarProductoPorId(idProducto) {
  return baseDeDatos.productos.find(producto => producto.id === idProducto);
}

function generarColorPorPosicion(posicion, cantidadTotal) {
  return `hsl(${Math.round(posicion * 360 / cantidadTotal)}, 62%, 50%)`;
}

/* ===== ALMACENAMIENTO ===== */
function configuracionPorDefecto() {
  return { nombreClub: "Club de Rugby Ezeiza", logo: LOGO_DEL_CLUB, colorPrincipal: "#1f1e1b", colorAcento: "#ee6c2d" };
}

function guardarBaseDeDatos() {
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(baseDeDatos));
  } catch (error) {
    mostrarNotificacion("No se pudo guardar: la imagen es muy pesada o el almacenamiento está lleno.", true);
  }
}

function cargarBaseDeDatos() {
  try {
    const datosGuardados = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (datosGuardados) {
      baseDeDatos = JSON.parse(datosGuardados);
      baseDeDatos.configuracion = Object.assign(configuracionPorDefecto(), baseDeDatos.configuracion);
      return;
    }
  } catch (error) { /* si falla la lectura se cargan los datos de ejemplo */ }
  cargarDatosDeEjemplo();
}

function generarVentasDeEjemplo() {
  let semilla = 7;
  const numeroAleatorio = () => (semilla = (semilla * 9301 + 49297) % 233280) / 233280;
  const productosVendibles = [
    { id: 1, nombre: "Chomba naranja", talles: ["2", "4", "6", "8", "10", "12", "14", "S", "M", "L", "XL", "XXL", "XXXL"], pesos: [2, 3, 4, 5, 3, 2, 1, 6, 9, 7, 4, 2, 1] },
    { id: 3, nombre: "Gorra azul", talles: ["S", "M", "L"], pesos: [2, 5, 3] }
  ];
  const ventas = [];
  for (let numeroVenta = 0; numeroVenta < 70; numeroVenta++) {
    const producto = productosVendibles[numeroAleatorio() < 0.7 ? 0 : 1];
    let punto = numeroAleatorio() * producto.pesos.reduce((a, b) => a + b, 0);
    let posicion = 0;
    while (punto > producto.pesos[posicion] && posicion < producto.pesos.length - 1) { punto -= producto.pesos[posicion]; posicion++; }
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - Math.floor(numeroAleatorio() * numeroAleatorio() * 180));
    ventas.push({ id: numeroVenta + 1, idProducto: producto.id, nombreProducto: producto.nombre, talle: producto.talles[posicion], cantidad: 1 + (numeroAleatorio() < 0.2 ? 1 : 0), fecha: fecha.toISOString() });
  }
  [100, 120, 140].forEach((diasAtras, posicion) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);
    ventas.push({ id: 100 + posicion, idProducto: 2, nombreProducto: "Bolso deportivo", talle: "Único", cantidad: 1, fecha: fecha.toISOString() });
  });
  return ventas.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function cargarDatosDeEjemplo() {
  const configuracionActual = baseDeDatos.configuracion || configuracionPorDefecto();
  baseDeDatos = {
    productos: [
      { id: 1, nombre: "Chomba naranja", categoria: "Indumentaria", imagen: "",
        talles: [...TALLES_NUMERICOS.map((talle, i) => crearTalle(talle, [3, 4, 5, 1, 6, 4, 2][i])), ...TALLES_EN_LETRAS.map((talle, i) => crearTalle(talle, [5, 2, 6, 3, 4, 0][i]))] },
      { id: 2, nombre: "Bolso deportivo", categoria: "Bolsos", imagen: "", talles: [crearTalle("Único", 8)] },
      { id: 3, nombre: "Gorra azul", categoria: "Accesorios", imagen: "", talles: [crearTalle("S", 4), crearTalle("M", 1), crearTalle("L", 6)] }
    ],
    ventas: generarVentasDeEjemplo(),
    configuracion: configuracionActual
  };
  guardarBaseDeDatos();
}

/* ===== NOTIFICACIONES Y ALERTAS CRÍTICAS ===== */
function mostrarNotificacion(mensaje, esCritica) {
  const elementoNotificacion = document.createElement("div");
  elementoNotificacion.className = "notificacion" + (esCritica ? " notificacionCritica" : "");
  elementoNotificacion.textContent = mensaje;
  seleccionar("#contenedorNotificaciones").append(elementoNotificacion);
  setTimeout(() => elementoNotificacion.remove(), 5000);
}

function renderizarAlertasCriticas() {
  const avisos = [];
  baseDeDatos.productos.forEach(producto => producto.talles.forEach(talle => {
    if (talle.stock <= 1) avisos.push(`${producto.nombre}, talle ${talle.talle}: ${talle.stock === 0 ? "agotado" : "queda 1 unidad"}`);
  }));
  seleccionar("#contenedorAlertasCriticas").innerHTML = avisos.length
    ? `<div class="alertaStockCritico" role="alert">Stock crítico en ${avisos.length} talle${avisos.length > 1 ? "s" : ""}<ul class="listaAlertaStockCritico">${avisos.map(aviso => `<li>${escaparHtml(aviso)}</li>`).join("")}</ul></div>`
    : "";
}

/* ===== IDENTIDAD DEL CLUB (logo y colores) ===== */
function aplicarIdentidadDelClub() {
  const configuracion = baseDeDatos.configuracion;
  const estiloRaiz = document.documentElement.style;
  estiloRaiz.setProperty("--colorPrincipal", configuracion.colorPrincipal);
  estiloRaiz.setProperty("--colorAcento", configuracion.colorAcento);
  seleccionar("#textoNombreClub").textContent = configuracion.nombreClub;
  const imagenLogo = seleccionar("#imagenLogoClub");
  if (configuracion.logo) { imagenLogo.src = configuracion.logo; imagenLogo.hidden = false; }
  else { imagenLogo.hidden = true; }
}

function reducirImagenDesdeArchivo(archivo, ladoMaximo, formato, calidad, alTerminar) {
  const lector = new FileReader();
  lector.onload = () => {
    const imagen = new Image();
    imagen.onload = () => {
      const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
      const lienzo = document.createElement("canvas");
      lienzo.width = imagen.width * escala;
      lienzo.height = imagen.height * escala;
      lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      alTerminar(lienzo.toDataURL(formato, calidad));
    };
    imagen.src = lector.result;
  };
  lector.readAsDataURL(archivo);
}

function crearMiniaturaProducto(producto, esChica) {
  const claseTamano = esChica ? " miniaturaChica" : "";
  if (producto.imagen) return `<img class="miniaturaProducto${claseTamano}" src="${producto.imagen}" alt="${escaparHtml(producto.nombre)}">`;
  return `<div class="miniaturaProducto miniaturaProductoVacia${claseTamano}" aria-hidden="true">${escaparHtml((producto.nombre[0] || "?").toUpperCase())}</div>`;
}

/* ===== VISTA: STOCK ===== */
function renderizarVistaStock() {
  const todosLosTalles = [...new Set(baseDeDatos.productos.flatMap(producto => producto.talles.map(talle => talle.talle)))];
  const opcionesCategorias = obtenerCategoriasExistentes().map(categoria => `<option ${filtrosListado.categoria === categoria ? "selected" : ""}>${escaparHtml(categoria)}</option>`).join("");
  const opcionesTalles = todosLosTalles.map(talle => `<option ${filtrosListado.talle === talle ? "selected" : ""}>${escaparHtml(talle)}</option>`).join("");
  const productosFiltrados = baseDeDatos.productos.filter(producto =>
    producto.nombre.toLowerCase().includes(filtrosListado.texto.toLowerCase()) &&
    (!filtrosListado.categoria || producto.categoria === filtrosListado.categoria) &&
    (!filtrosListado.talle || producto.talles.some(talle => talle.talle === filtrosListado.talle)));

  const tarjetasProductos = productosFiltrados.map(producto => {
    const chipsTalles = producto.talles.filter(talle => !filtrosListado.talle || talle.talle === filtrosListado.talle).map(talle =>
      `<button class="chipTalle chipTalle${clasificarEstadoDeStock(talle.stock)}" data-id-producto="${producto.id}" data-talle="${escaparHtml(talle.talle)}" ${talle.stock === 0 ? "disabled" : ""} aria-label="Talle ${escaparHtml(talle.talle)}, ${talle.stock} en stock"><b class="etiquetaChipTalle">${escaparHtml(talle.talle)}</b><span class="cantidadChipTalle">${talle.stock}</span></button>`).join("");
    return `<article class="tarjetaProducto"><div class="tarjetaProductoSuperior">${crearMiniaturaProducto(producto, false)}<div><h3 class="nombreProducto">${escaparHtml(producto.nombre)}</h3><div class="textoSecundario">${escaparHtml(producto.categoria)} · ${sumarStockDeProducto(producto)} u. en total</div></div></div><div class="contenedorChipsTalles">${chipsTalles}</div></article>`;
  }).join("");

  seleccionar("#vistaPrincipal").innerHTML = `
    <div class="filtrosListado">
      <input class="campoTexto campoFiltro" id="campoFiltroNombre" placeholder="Buscar por nombre" value="${escaparHtml(filtrosListado.texto)}">
      <select class="campoTexto campoFiltro" id="campoFiltroCategoria"><option value="">Todas las categorías</option>${opcionesCategorias}</select>
      <select class="campoTexto campoFiltro" id="campoFiltroTalle"><option value="">Todos los talles</option>${opcionesTalles}</select>
    </div>
    <p class="textoAyuda">Tocá un talle para registrar una venta. Rojo: queda 1 o ninguna unidad. Amarillo: quedan 2 o 3.</p>
    ${productosFiltrados.length ? `<div class="cuadriculaProductos">${tarjetasProductos}</div>` : `<div class="mensajeVacio">No hay productos con esos filtros. Agregá uno desde Administrar.</div>`}`;

  seleccionar("#campoFiltroNombre").oninput = evento => {
    filtrosListado.texto = evento.target.value;
    renderizarVistaStock();
    const campo = seleccionar("#campoFiltroNombre");
    campo.focus();
    campo.setSelectionRange(filtrosListado.texto.length, filtrosListado.texto.length);
  };
  seleccionar("#campoFiltroCategoria").onchange = evento => { filtrosListado.categoria = evento.target.value; renderizarVistaStock(); };
  seleccionar("#campoFiltroTalle").onchange = evento => { filtrosListado.talle = evento.target.value; renderizarVistaStock(); };
  document.querySelectorAll(".chipTalle").forEach(boton => {
    boton.onclick = () => abrirDialogoDeVenta(Number(boton.dataset.idProducto), boton.dataset.talle);
  });
}

/* ===== REGISTRO DE VENTAS ===== */
function abrirDialogoDeVenta(idProducto, talleVendido) {
  const producto = buscarProductoPorId(idProducto);
  const talle = producto.talles.find(item => item.talle === talleVendido);
  ventaEnCurso = { idProducto, talle: talleVendido };
  seleccionar("#tituloDialogoVenta").textContent = `${producto.nombre}, talle ${talleVendido}`;
  seleccionar("#textoStockDialogoVenta").textContent = `Stock actual: ${talle.stock}`;
  const campoCantidad = seleccionar("#campoCantidadVendida");
  campoCantidad.max = talle.stock;
  campoCantidad.value = 1;
  seleccionar("#dialogoRegistrarVenta").showModal();
  campoCantidad.focus();
}

function confirmarVentaEnCurso() {
  const producto = buscarProductoPorId(ventaEnCurso.idProducto);
  const talle = producto.talles.find(item => item.talle === ventaEnCurso.talle);
  const cantidad = parseInt(seleccionar("#campoCantidadVendida").value, 10);
  if (!cantidad || cantidad < 1 || cantidad > talle.stock) {
    mostrarNotificacion(`Cantidad inválida. Hay ${talle.stock} en stock.`, true);
    return;
  }
  talle.stock -= cantidad;
  baseDeDatos.ventas.unshift({ id: Date.now(), idProducto: producto.id, nombreProducto: producto.nombre, talle: talle.talle, cantidad, fecha: new Date().toISOString() });
  guardarBaseDeDatos();
  seleccionar("#dialogoRegistrarVenta").close();
  if (talle.stock === 1) mostrarNotificacion(`Atención: ${producto.nombre}, talle ${talle.talle} quedó con 1 unidad.`, true);
  else if (talle.stock === 0) mostrarNotificacion(`${producto.nombre}, talle ${talle.talle} se agotó.`, true);
  else mostrarNotificacion(`Venta registrada: ${producto.nombre}, talle ${talle.talle} ×${cantidad}`, false);
  mostrarVistaActual();
}

/* ===== VISTA: REPORTE ===== */
function renderizarVistaReporte() {
  const filasProductos = baseDeDatos.productos.map(producto => {
    const chips = producto.talles.map(talle => `<span class="chipTalle chipTalle${clasificarEstadoDeStock(talle.stock)} chipTalleInformativo"><b class="etiquetaChipTalle">${escaparHtml(talle.talle)}</b><span class="cantidadChipTalle">${talle.stock}</span></span>`).join("");
    return `<tr><td><b>${escaparHtml(producto.nombre)}</b><div class="textoSecundario">${escaparHtml(producto.categoria)}</div></td><td class="celdaNumero">${sumarStockDeProducto(producto)}</td><td class="celdaChipsTalles">${chips}</td></tr>`;
  }).join("");
  const totalUnidades = baseDeDatos.productos.reduce((total, producto) => total + sumarStockDeProducto(producto), 0);
  seleccionar("#vistaPrincipal").innerHTML = `
    <p class="textoAyuda">Total en stock: <b>${totalUnidades}</b> unidades en ${baseDeDatos.productos.length} productos.</p>
    <div class="contenedorTabla"><table class="tablaDatos"><thead><tr><th>Producto</th><th>Total</th><th>Stock por talle</th></tr></thead><tbody>${filasProductos || `<tr><td colspan="3" class="mensajeVacio">Sin productos.</td></tr>`}</tbody></table></div>
    <button class="boton botonSecundario botonDescargarReporte" id="botonDescargarReporteCsv">Descargar reporte en CSV</button>`;
  seleccionar("#botonDescargarReporteCsv").onclick = descargarReporteCsv;
}

function descargarReporteCsv() {
  const entreComillas = valor => `"${String(valor).replace(/"/g, '""')}"`;
  const lineas = ["Producto,Categoría,Talle,Stock", ...baseDeDatos.productos.flatMap(producto => producto.talles.map(talle => [producto.nombre, producto.categoria, talle.talle, talle.stock].map(entreComillas).join(",")))];
  const enlaceDescarga = document.createElement("a");
  enlaceDescarga.href = "data:text/csv;charset=utf-8," + encodeURIComponent("\ufeff" + lineas.join("\n"));
  enlaceDescarga.download = "stock.csv";
  enlaceDescarga.click();
}

/* ===== VISTA: HISTORIAL DE VENTAS ===== */
function renderizarVistaVentas() {
  const filasVentas = baseDeDatos.ventas.map(venta => `<tr><td>${new Date(venta.fecha).toLocaleString("es-AR")}</td><td>${escaparHtml(venta.nombreProducto)}</td><td>${escaparHtml(venta.talle)}</td><td class="celdaNumero">${venta.cantidad}</td></tr>`).join("");
  seleccionar("#vistaPrincipal").innerHTML = `<div class="contenedorTabla"><table class="tablaDatos"><thead><tr><th>Fecha</th><th>Producto</th><th>Talle</th><th>Cantidad</th></tr></thead><tbody>${filasVentas || `<tr><td colspan="4" class="mensajeVacio">Todavía no registraste ventas. Tocá un talle en Stock para empezar.</td></tr>`}</tbody></table></div>`;
}

/* ===== VISTA: ESTADÍSTICAS (gráficos SVG) ===== */
function construirBarrasHorizontales(listaOrdenada) {
  const valorMaximo = listaOrdenada.length ? listaOrdenada[0][1] : 1;
  return listaOrdenada.map(([etiqueta, valor]) => `<div class="filaBarra"><span>${escaparHtml(etiqueta)}</span><svg class="pistaBarra" viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label="${escaparHtml(etiqueta)}: ${valor}"><rect class="fondoPistaBarra" width="100" height="10"/><rect class="rellenoBarra" width="${valor / valorMaximo * 100}" height="10"/></svg><b>${valor}</b></div>`).join("");
}

function construirCuadroDeColor(color) {
  return `<svg class="cuadroColorLeyenda" viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" rx="2" fill="${color}"/></svg>`;
}

function construirGraficoDeTorta(rankingProductos, totalUnidades) {
  let acumulado = 0;
  const porciones = rankingProductos.map(([, cantidad], posicion) => {
    const porcentaje = cantidad / totalUnidades * 100;
    const porcion = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${generarColorPorPosicion(posicion, rankingProductos.length)}" stroke-width="10" stroke-dasharray="${porcentaje} ${100 - porcentaje}" stroke-dashoffset="${-acumulado}" transform="rotate(-90 21 21)"/>`;
    acumulado += porcentaje;
    return porcion;
  }).join("");
  return `<svg class="tortaGrafico" viewBox="0 0 42 42" role="img" aria-label="Torta de ventas por producto">${porciones}</svg>`;
}

function construirGraficoLineaMensual(ventasPorMes) {
  const meses = Object.keys(ventasPorMes).sort();
  const valores = meses.map(mes => ventasPorMes[mes]);
  const valorMaximo = Math.max(...valores);
  const puntos = meses.map((mes, i) => [20 + (meses.length > 1 ? i * 360 / (meses.length - 1) : 180), 115 - valores[i] / valorMaximo * 90]);
  const detalle = puntos.map((punto, i) => `<circle class="puntoEvolucion" cx="${punto[0]}" cy="${punto[1]}" r="4"/><text class="textoValorGrafico" x="${punto[0]}" y="${punto[1] - 8}">${valores[i]}</text><text class="textoMesGrafico" x="${punto[0]}" y="142">${meses[i].slice(5)}/${meses[i].slice(2, 4)}</text>`).join("");
  return `<svg class="graficoLineaMensual" viewBox="0 0 400 150" role="img" aria-label="Unidades vendidas por mes"><polyline class="lineaEvolucion" points="${puntos.map(punto => punto.join(",")).join(" ")}"/>${detalle}</svg>`;
}

function calcularTallesDeVentaRapida(ventasRecientes) {
  const resultado = [];
  baseDeDatos.productos.forEach(producto => producto.talles.forEach(talle => {
    const vendidas = ventasRecientes.filter(venta => venta.idProducto === producto.id && venta.talle === talle.talle).reduce((total, venta) => total + venta.cantidad, 0);
    if (vendidas >= 3) {
      const diasDeStock = Math.round(talle.stock / (vendidas / DIAS_VENTANA_ROTACION));
      if (diasDeStock <= 30) resultado.push({ nombre: producto.nombre, talle: talle.talle, vendidas, stock: talle.stock, diasDeStock });
    }
  }));
  return resultado.sort((a, b) => a.diasDeStock - b.diasDeStock);
}

function renderizarVistaEstadisticas() {
  const ventas = baseDeDatos.ventas;
  if (!ventas.length) {
    seleccionar("#vistaPrincipal").innerHTML = `<div class="mensajeVacio">Todavía no hay ventas para analizar. Registrá ventas en Stock o cargá los datos de ejemplo.</div>`;
    return;
  }
  const sumarEn = (acumulador, clave, cantidad) => { acumulador[clave] = (acumulador[clave] || 0) + cantidad; };
  const porProducto = {}, porTalle = {}, porProductoYTalle = {}, porMes = {}, porCategoria = {};
  const categoriaDe = nombre => (baseDeDatos.productos.find(producto => producto.nombre === nombre) || {}).categoria || "Sin categoría";
  ventas.forEach(venta => {
    sumarEn(porProducto, venta.nombreProducto, venta.cantidad);
    sumarEn(porTalle, venta.talle, venta.cantidad);
    sumarEn(porProductoYTalle, venta.nombreProducto + "|" + venta.talle, venta.cantidad);
    sumarEn(porMes, venta.fecha.slice(0, 7), venta.cantidad);
    sumarEn(porCategoria, categoriaDe(venta.nombreProducto), venta.cantidad);
  });
  const ordenarDeMayorAMenor = objeto => Object.entries(objeto).sort((a, b) => b[1] - a[1]);
  const totalUnidades = ventas.reduce((total, venta) => total + venta.cantidad, 0);
  const rankingProductos = ordenarDeMayorAMenor(porProducto);
  const rankingTalles = ordenarDeMayorAMenor(porTalle);
  const nombresTalles = rankingTalles.map(item => item[0]);
  const maximoPorProducto = rankingProductos[0][1];

  const leyendaProductos = rankingProductos.map(([nombre, cantidad], i) => `<span class="itemLeyenda">${construirCuadroDeColor(generarColorPorPosicion(i, rankingProductos.length))}${escaparHtml(nombre)} (${Math.round(cantidad / totalUnidades * 100)}%)</span>`).join("");
  const leyendaTalles = nombresTalles.map((talle, i) => `<span class="itemLeyenda">${construirCuadroDeColor(generarColorPorPosicion(i, nombresTalles.length))}${escaparHtml(talle)}</span>`).join("");

  const barrasApiladas = rankingProductos.map(([nombre, total]) => {
    let desplazamiento = 0;
    const segmentos = nombresTalles.map((talle, i) => {
      const cantidad = porProductoYTalle[nombre + "|" + talle];
      if (!cantidad) return "";
      const ancho = cantidad / maximoPorProducto * 100;
      const segmento = `<rect x="${desplazamiento}" width="${ancho}" height="10" fill="${generarColorPorPosicion(i, nombresTalles.length)}"><title>Talle ${escaparHtml(talle)}: ${cantidad}</title></rect>`;
      desplazamiento += ancho;
      return segmento;
    }).join("");
    return `<div class="filaBarra"><span>${escaparHtml(nombre)}</span><svg class="pistaBarra" viewBox="0 0 100 10" preserveAspectRatio="none" role="img" aria-label="Talles vendidos de ${escaparHtml(nombre)}"><rect class="fondoPistaBarra" width="100" height="10"/>${segmentos}</svg><b>${total}</b></div>`;
  }).join("");

  const rankingProductoYTalle = ordenarDeMayorAMenor(porProductoYTalle).slice(0, 5).map(([clave, cantidad]) => { const [nombre, talle] = clave.split("|"); return [`${nombre}, talle ${talle}`, cantidad]; });
  const promedioPorCategoria = Object.entries(porCategoria).map(([categoria, cantidad]) => [categoria, +(cantidad / Math.max(1, baseDeDatos.productos.filter(producto => producto.categoria === categoria).length)).toFixed(1)]).sort((a, b) => b[1] - a[1]);

  const ventasRecientes = ventas.filter(venta => Date.now() - new Date(venta.fecha) <= DIAS_VENTANA_ROTACION * MILISEGUNDOS_POR_DIA);
  const alertasReposicion = calcularTallesDeVentaRapida(ventasRecientes).map(item => `<div class="alertaReposicion">${escaparHtml(item.nombre)}, talle ${escaparHtml(item.talle)}: se vendieron ${item.vendidas} en ${DIAS_VENTANA_ROTACION} días y quedan ${item.stock}. Alcanza para unos ${item.diasDeStock} días. Conviene reponer.</div>`).join("");
  const alertasBajaRotacion = baseDeDatos.productos.filter(producto => !ventasRecientes.some(venta => venta.idProducto === producto.id) && sumarStockDeProducto(producto) > 0).map(producto => `<div class="alertaBajaRotacion">${escaparHtml(producto.nombre)}: sin ventas en ${DIAS_VENTANA_ROTACION} días y ${sumarStockDeProducto(producto)} unidades paradas. Evaluá una promoción.</div>`).join("");

  seleccionar("#vistaPrincipal").innerHTML = `
    <p class="textoAyuda">${totalUnidades} unidades vendidas en ${ventas.length} ventas.</p>
    <div class="grillaDosColumnas">
      <section class="panel"><h3 class="tituloPanel">Productos más vendidos (unidades)</h3>${construirBarrasHorizontales(rankingProductos)}</section>
      <section class="panel"><h3 class="tituloPanel">Participación por producto</h3><div class="contenedorTorta">${construirGraficoDeTorta(rankingProductos, totalUnidades)}<div class="leyenda">${leyendaProductos}</div></div></section>
    </div>
    <div class="grillaDosColumnas">
      <section class="panel"><h3 class="tituloPanel">Talles más vendidos</h3>${construirBarrasHorizontales(rankingTalles)}</section>
      <section class="panel"><h3 class="tituloPanel">Talles dentro de cada producto</h3>${barrasApiladas}<div class="leyenda leyendaHorizontal">${leyendaTalles}</div></section>
    </div>
    <div class="grillaDosColumnas">
      <section class="panel"><h3 class="tituloPanel">Producto y talle más vendidos</h3>${construirBarrasHorizontales(rankingProductoYTalle)}</section>
      <section class="panel"><h3 class="tituloPanel">Promedio de unidades vendidas por producto, por categoría</h3>${construirBarrasHorizontales(promedioPorCategoria)}</section>
    </div>
    <section class="panel"><h3 class="tituloPanel">Evolución de ventas por mes</h3>${construirGraficoLineaMensual(porMes)}</section>
    <section class="panel"><h3 class="tituloPanel">Alertas de reposición y rotación</h3>${alertasReposicion || `<p class="textoSecundario">Ningún talle necesita reposición urgente.</p>`}${alertasBajaRotacion}</section>`;
}

/* ===== VISTA: ADMINISTRAR (identidad, alta y edición de productos) ===== */
function crearBorradorProducto(productoExistente) {
  return productoExistente ? JSON.parse(JSON.stringify(productoExistente)) : { id: null, nombre: "", categoria: "Indumentaria", imagen: "", talles: [] };
}

function sincronizarCamposBasicosDelBorrador() {
  borradorProducto.nombre = seleccionar("#campoNombreProducto").value;
  borradorProducto.categoria = seleccionar("#campoCategoriaProducto").value;
}

function agregarTallesAlBorrador(listaDeTalles) {
  sincronizarCamposBasicosDelBorrador();
  listaDeTalles.forEach(nuevoTalle => {
    const yaExiste = borradorProducto.talles.some(talle => talle.talle.toLowerCase() === nuevoTalle.toLowerCase());
    if (nuevoTalle && !yaExiste) borradorProducto.talles.push(crearTalle(nuevoTalle, 0));
  });
  renderizarVistaAdministrar();
}

function guardarBorradorProducto() {
  sincronizarCamposBasicosDelBorrador();
  if (!borradorProducto.nombre.trim()) { mostrarNotificacion("Ponele un nombre al producto.", true); return; }
  if (!borradorProducto.talles.length) { mostrarNotificacion("Agregá al menos un talle.", true); return; }
  borradorProducto.nombre = borradorProducto.nombre.trim();
  borradorProducto.categoria = borradorProducto.categoria.trim() || "Sin categoría";
  if (borradorProducto.id) {
    const posicion = baseDeDatos.productos.findIndex(producto => producto.id === borradorProducto.id);
    baseDeDatos.productos[posicion] = borradorProducto;
    mostrarNotificacion("Producto actualizado", false);
  } else {
    borradorProducto.id = Date.now();
    baseDeDatos.productos.push(borradorProducto);
    mostrarNotificacion("Producto agregado", false);
  }
  borradorProducto = null;
  guardarBaseDeDatos();
  mostrarVistaActual();
}

function eliminarProductoConConfirmacion(idProducto) {
  const producto = buscarProductoPorId(idProducto);
  if (confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) {
    baseDeDatos.productos = baseDeDatos.productos.filter(item => item.id !== idProducto);
    guardarBaseDeDatos();
    mostrarVistaActual();
  }
}

function renderizarVistaAdministrar() {
  const borrador = borradorProducto || (borradorProducto = crearBorradorProducto(null));
  const configuracion = baseDeDatos.configuracion;
  const filasTalles = borrador.talles.length
    ? borrador.talles.map((talle, posicion) => `<div class="filaTalleEditable"><b class="etiquetaTalle">${escaparHtml(talle.talle)}</b><input class="campoTexto campoStockTalle" type="number" min="0" value="${talle.stock}" data-indice-talle="${posicion}" aria-label="Stock talle ${escaparHtml(talle.talle)}"><button class="boton botonPeligro botonChico" data-quitar-talle="${posicion}" aria-label="Quitar talle ${escaparHtml(talle.talle)}">Quitar</button></div>`).join("")
    : `<p class="textoSecundario">Agregá al menos un talle.</p>`;
  const filasProductos = baseDeDatos.productos.map(producto => `<tr><td><div class="filaMiniaturaYBoton">${crearMiniaturaProducto(producto, true)}${escaparHtml(producto.nombre)}</div></td><td>${escaparHtml(producto.categoria)}</td><td>${producto.talles.length}</td><td class="celdaAcciones"><button class="boton botonSecundario botonChico" data-editar-producto="${producto.id}">Editar</button> <button class="boton botonPeligro botonChico" data-eliminar-producto="${producto.id}">Eliminar</button></td></tr>`).join("");

  seleccionar("#vistaPrincipal").innerHTML = `
    <section class="panel">
      <h2 class="tituloPanel">Identidad del club</h2>
      <div class="filaFormulario">
        <label class="etiquetaCampo">Nombre<input class="campoTexto" id="campoNombreClub" value="${escaparHtml(configuracion.nombreClub)}"></label>
        <label class="etiquetaCampo">Color principal<input class="campoTexto" type="color" id="campoColorPrincipal" value="${configuracion.colorPrincipal}"></label>
        <label class="etiquetaCampo">Color de acento<input class="campoTexto" type="color" id="campoColorAcento" value="${configuracion.colorAcento}"></label>
        <label class="etiquetaCampo">Logo<input class="campoTexto" type="file" id="campoArchivoLogo" accept="image/*"></label>
      </div>
      <button class="boton botonSecundario botonChico" id="botonRestaurarIdentidad">Volver a la identidad original</button>
    </section>
    <section class="panel">
      <h2 class="tituloPanel">${borrador.id ? "Editar producto" : "Nuevo producto"}</h2>
      <div class="filaFormulario">
        <label class="etiquetaCampo">Nombre<input class="campoTexto" id="campoNombreProducto" value="${escaparHtml(borrador.nombre)}" placeholder="Ej: Chomba naranja"></label>
        <label class="etiquetaCampo">Categoría<input class="campoTexto" id="campoCategoriaProducto" list="listaCategoriasSugeridas" value="${escaparHtml(borrador.categoria)}"><datalist id="listaCategoriasSugeridas">${obtenerCategoriasExistentes().map(categoria => `<option value="${escaparHtml(categoria)}">`).join("")}</datalist></label>
        <label class="etiquetaCampo">Imagen<input class="campoTexto" type="file" id="campoArchivoImagenProducto" accept="image/*"></label>
      </div>
      ${borrador.imagen ? `<div class="filaMiniaturaYBoton"><img class="miniaturaProducto" src="${borrador.imagen}" alt="Vista previa"><button class="boton botonSecundario botonChico" id="botonQuitarImagenProducto">Quitar imagen</button></div>` : ""}
      <div class="tituloSeccionTalles">Talles y stock</div>
      <div class="filaFormulario filaAccionesTalles">
        <button class="boton botonSecundario botonChico" id="botonAgregarTallesNumericos">Agregar 2–14</button>
        <button class="boton botonSecundario botonChico" id="botonAgregarTallesEnLetras">Agregar S–XXXL</button>
        <button class="boton botonSecundario botonChico" id="botonAgregarTalleUnico">Talle único</button>
        <input class="campoTexto campoTalleNuevo" id="campoTallePersonalizado" placeholder="Otro talle">
        <button class="boton botonSecundario botonChico" id="botonAgregarTallePersonalizado">Agregar</button>
      </div>
      <div>${filasTalles}</div>
      <div class="filaBotonesFormulario">
        <button class="boton" id="botonGuardarProducto">${borrador.id ? "Guardar cambios" : "Agregar producto"}</button>
        ${borrador.id ? `<button class="boton botonSecundario" id="botonCancelarEdicion">Cancelar</button>` : ""}
      </div>
    </section>
    <div class="contenedorTabla"><table class="tablaDatos"><thead><tr><th>Producto</th><th>Categoría</th><th>Talles</th><th></th></tr></thead><tbody>${filasProductos || `<tr><td colspan="4" class="mensajeVacio">Sin productos.</td></tr>`}</tbody></table></div>`;

  conectarEventosDeIdentidadDelClub();
  conectarEventosDelFormularioDeProducto();
}

function conectarEventosDeIdentidadDelClub() {
  const configuracion = baseDeDatos.configuracion;
  const guardarIdentidad = () => {
    configuracion.nombreClub = seleccionar("#campoNombreClub").value || "Club de Rugby Ezeiza";
    configuracion.colorPrincipal = seleccionar("#campoColorPrincipal").value;
    configuracion.colorAcento = seleccionar("#campoColorAcento").value;
    guardarBaseDeDatos();
    aplicarIdentidadDelClub();
  };
  ["#campoNombreClub", "#campoColorPrincipal", "#campoColorAcento"].forEach(selector => { seleccionar(selector).oninput = guardarIdentidad; });
  seleccionar("#campoArchivoLogo").onchange = evento => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    reducirImagenDesdeArchivo(archivo, 240, "image/png", 1, logoNuevo => { configuracion.logo = logoNuevo; guardarBaseDeDatos(); aplicarIdentidadDelClub(); });
  };
  seleccionar("#botonRestaurarIdentidad").onclick = () => { baseDeDatos.configuracion = configuracionPorDefecto(); guardarBaseDeDatos(); mostrarVistaActual(); };
}

function conectarEventosDelFormularioDeProducto() {
  seleccionar("#botonAgregarTallesNumericos").onclick = () => agregarTallesAlBorrador(TALLES_NUMERICOS);
  seleccionar("#botonAgregarTallesEnLetras").onclick = () => agregarTallesAlBorrador(TALLES_EN_LETRAS);
  seleccionar("#botonAgregarTalleUnico").onclick = () => agregarTallesAlBorrador(["Único"]);
  seleccionar("#botonAgregarTallePersonalizado").onclick = () => agregarTallesAlBorrador([seleccionar("#campoTallePersonalizado").value.trim()]);
  document.querySelectorAll("[data-indice-talle]").forEach(campo => {
    campo.oninput = () => { borradorProducto.talles[Number(campo.dataset.indiceTalle)].stock = Math.max(0, parseInt(campo.value, 10) || 0); };
  });
  document.querySelectorAll("[data-quitar-talle]").forEach(boton => {
    boton.onclick = () => { sincronizarCamposBasicosDelBorrador(); borradorProducto.talles.splice(Number(boton.dataset.quitarTalle), 1); renderizarVistaAdministrar(); };
  });
  seleccionar("#campoArchivoImagenProducto").onchange = evento => {
    sincronizarCamposBasicosDelBorrador();
    const archivo = evento.target.files[0];
    if (!archivo) return;
    reducirImagenDesdeArchivo(archivo, 320, "image/jpeg", 0.75, imagenNueva => { borradorProducto.imagen = imagenNueva; renderizarVistaAdministrar(); });
  };
  const botonQuitarImagen = seleccionar("#botonQuitarImagenProducto");
  if (botonQuitarImagen) botonQuitarImagen.onclick = () => { sincronizarCamposBasicosDelBorrador(); borradorProducto.imagen = ""; renderizarVistaAdministrar(); };
  seleccionar("#botonGuardarProducto").onclick = guardarBorradorProducto;
  const botonCancelar = seleccionar("#botonCancelarEdicion");
  if (botonCancelar) botonCancelar.onclick = () => { borradorProducto = null; renderizarVistaAdministrar(); };
  document.querySelectorAll("[data-editar-producto]").forEach(boton => {
    boton.onclick = () => { borradorProducto = crearBorradorProducto(buscarProductoPorId(Number(boton.dataset.editarProducto))); renderizarVistaAdministrar(); scrollTo(0, 0); };
  });
  document.querySelectorAll("[data-eliminar-producto]").forEach(boton => {
    boton.onclick = () => eliminarProductoConConfirmacion(Number(boton.dataset.eliminarProducto));
  });
}

/* ===== NAVEGACIÓN Y ARRANQUE ===== */
function mostrarVistaActual() {
  aplicarIdentidadDelClub();
  renderizarAlertasCriticas();
  const vistasPorPestana = { stock: renderizarVistaStock, reporte: renderizarVistaReporte, ventas: renderizarVistaVentas, estadisticas: renderizarVistaEstadisticas, administrar: renderizarVistaAdministrar };
  vistasPorPestana[pestanaActiva]();
}

function conectarEventosGenerales() {
  document.querySelectorAll(".botonPestana").forEach(botonPestana => {
    botonPestana.onclick = () => {
      pestanaActiva = botonPestana.dataset.pestana;
      document.querySelectorAll(".botonPestana").forEach(otro => otro.setAttribute("aria-selected", otro === botonPestana));
      mostrarVistaActual();
    };
  });
  seleccionar("#botonCargarDatosEjemplo").onclick = () => {
    if (confirm("Esto reemplaza tus productos y ventas por el ejemplo. ¿Continuar?")) { cargarDatosDeEjemplo(); borradorProducto = null; mostrarVistaActual(); }
  };
  seleccionar("#botonCancelarVenta").onclick = () => seleccionar("#dialogoRegistrarVenta").close();
  seleccionar("#botonConfirmarVenta").onclick = confirmarVentaEnCurso;
}

cargarBaseDeDatos();
conectarEventosGenerales();
mostrarVistaActual();
