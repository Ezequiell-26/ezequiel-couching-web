/**
 * Contenido legal base (LSSI-CE / RGPD / LOPDGDD).
 * Los campos entre corchetes son placeholders OBLIGATORIOS de sustituir con los
 * datos reales del titular antes de publicar en producción.
 */

export const legalOwner = {
  titular: "[NOMBRE DEL TITULAR]",
  nif: "[DNI/NIF del titular]",
  domicilio: "[Domicilio profesional]",
  email: "[SUSTITUIR: email de contacto]",
  dominio: "ezequielcoaching.example",
};

export const legalSections = {
  aviso: [
    {
      h: "Identificación del titular",
      p: `En cumplimiento de la Ley 34/2002 (LSSI-CE), se informa de que este sitio web es titularidad de ${legalOwner.titular}, con NIF ${legalOwner.nif}, domicilio en ${legalOwner.domicilio} y correo de contacto ${legalOwner.email}.`,
    },
    {
      h: "Objeto",
      p: "El sitio ofrece información y contratación de servicios de entrenamiento personal online, planes y productos digitales. Su uso implica la aceptación de estos términos.",
    },
    {
      h: "Propiedad intelectual",
      p: "Todos los contenidos (textos, marcas, diseño, programas) son propiedad del titular o de terceros que han autorizado su uso. Queda prohibida su reproducción sin autorización.",
    },
    {
      h: "Responsabilidad",
      p: "El contenido de este sitio tiene finalidad informativa y formativa en materia de ejercicio y hábitos saludables. No sustituye el consejo médico: ante dolor, lesión o patología, consulta a un profesional sanitario.",
    },
  ],
  privacidad: [
    {
      h: "Responsable del tratamiento",
      p: `${legalOwner.titular} (NIF ${legalOwner.nif}), ${legalOwner.domicilio}. Contacto: ${legalOwner.email}.`,
    },
    {
      h: "Datos que se tratan y finalidad",
      p: "Formularios de contacto y guía gratuita: nombre y email para responder a tu consulta o enviarte el recurso solicitado. Cuestionario inicial: datos físico-deportivos (edad, peso, altura, objetivo, experiencia, lesiones) para preparar tu propuesta de entrenamiento. Pedidos: datos necesarios para gestionar la compra y entrega.",
    },
    {
      h: "Base jurídica",
      p: "Consentimiento del interesado (art. 6.1.a RGPD) al enviar cada formulario, y ejecución de contrato (art. 6.1.b RGPD) en el caso de pedidos.",
    },
    {
      h: "Conservación",
      p: "Los datos se conservan mientras exista interés mutuo para prestar el servicio y, en su caso, durante los plazos legales de responsabilidad (fiscal y civil).",
    },
    {
      h: "Destinatarios",
      p: "No se ceden datos a terceros salvo obligación legal y proveedores estrictamente necesarios (alojamiento web, email, pasarela de pago), que actúan como encargados con contrato conforme al art. 28 RGPD.",
    },
    {
      h: "Derechos",
      p: `Puedes ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${legalOwner.email}. También puedes reclamar ante la AEPD (www.aepd.es).`,
    },
    {
      h: "Datos guardados en tu dispositivo",
      p: "El contador de calorías y el registro de progreso se almacenan únicamente en tu navegador (localStorage). El titular no tiene acceso a ellos.",
    },
  ],
  cookies: [
    {
      h: "Qué cookies usa este sitio",
      p: "Este sitio no utiliza cookies de seguimiento ni publicitarias. Solo se emplea almacenamiento local técnico (localStorage) para funciones que tú inicias: contador de calorías, progreso y preferencias de la sesión.",
    },
    {
      h: "Cookies de terceros",
      p: "Si en el futuro se integran servicios de terceros (p. ej., pasarela de pago o vídeo), esta política se actualizará e informará antes de su uso.",
    },
    {
      h: "Cómo gestionar el almacenamiento",
      p: "Puedes borrar los datos guardados desde cada herramienta (botón 'Borrar mis datos') o desde la configuración de tu navegador.",
    },
  ],
  terminos: [
    {
      h: "Condiciones de uso",
      p: "El acceso y uso del sitio atribuye la condición de usuario e implica la aceptación de estas condiciones. El usuario se compromete a un uso adecuado de los contenidos y servicios.",
    },
    {
      h: "Contratación de servicios online",
      p: "Los servicios de coaching se contratan por periodos mensuales sin permanencia, salvo indicación expresa en la ficha del servicio. El detalle económico se muestra antes de la contratación.",
    },
    {
      h: "Productos digitales",
      p: "Los planes y recursos digitales se entregan por descarga o acceso tras la confirmación del pago. Al tratarse de contenido digital suministrado de forma inmediata, el derecho de desistimiento puede quedar excluido conforme al art. 103.m del TRLGDCU, previo consentimiento expreso del usuario.",
    },
    {
      h: "Precios e impuestos",
      p: "Los precios se muestran con los impuestos aplicables. Si tu condición fiscal requiere facturación específica, indícalo en el proceso de compra.",
    },
    {
      h: "Derecho de desistimiento",
      p: "Para servicios por periodos, puedes cancelar la renovación antes del siguiente ciclo. Para contenido digital de entrega inmediata, consulta la exclusión del art. 103.m TRLGDCU indicada arriba. Ante cualquier duda, escríbenos antes de comprar.",
    },
    {
      h: "Reclamaciones",
      p: "Para cualquier incidencia escribe al email de contacto. Consumidores pueden acudir a las Juntas Arbitrales de Consumo o a la ODR europea.",
    },
  ],
};
