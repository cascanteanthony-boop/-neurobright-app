// ============================================================
// Integración de Paddle (PRODUCCIÓN) para NeuroBright
// ------------------------------------------------------------
// ÚNICO PASO MANUAL: pega tu token "client-side" de producción
// (empieza con live_ y termina en ...48eaf) en la línea de abajo.
// Lo copias en Paddle: Developer Tools → Authentication →
// tokens del lado del cliente → neurobright-web → (...) → Copiar
// ============================================================

const PADDLE_CLIENT_TOKEN = 'live_c30d8a93a6be313ef5864e48eaf';

// Precio real: NeuroBright Premium — Plan Mensual $14.99 USD
const PADDLE_PRICE_ID = 'pri_01kyfwsv34mtsmxr9jzkfn2zt0';

declare global {
  interface Window {
    Paddle?: any;
  }
}

let loadPromise: Promise<any> | null = null;

/**
 * Carga Paddle.js desde el CDN oficial (solo la primera vez)
 * y lo inicializa con el token de producción.
 */
function loadPaddle(): Promise<any> {
  if (window.Paddle) {
    return Promise.resolve(window.Paddle);
  }
  if (loadPromise) {
    return loadPromise;
  }
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      try {
        window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
        resolve(window.Paddle);
      } catch (error) {
        loadPromise = null;
        reject(error);
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('No se pudo cargar Paddle.js'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Abre el checkout de Paddle (ventana superpuesta) con la
 * suscripción mensual de NeuroBright Premium.
 * Si se conoce el correo del usuario, se precarga en el checkout.
 */
export async function openCheckout(email?: string, locale: string = 'es'): Promise<void> {
  const Paddle = await loadPaddle();

  const customer =
    email && email.includes('@') ? { email } : undefined;

  Paddle.Checkout.open({
    items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
    customer,
    settings: {
      displayMode: 'overlay',
      locale,
    },
  });
}
