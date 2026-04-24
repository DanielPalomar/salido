import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";

export default function App() {
  const [productos, setProductos] = useState([]);
  const [escaneando, setEscaneando] = useState(true);
  const ultimoCodigoRef = useRef(null);
  const contadorRef = useRef(0);

  const sonido = new Audio("https://www.myinstants.com/media/sounds/yamete-kudasai.mp3");

  // ==============================
  // FETCH ULTRA ROBUSTO
  // ==============================
  const fetchProducto = async (codigo) => {
    try {
      let producto = {
        id: Date.now(),
        codigo,
        nombre: "No encontrado",
        marca: "-",
        imagen: "",
        datosExtra: ""
      };

      const tryFetch = async (url, parser) => {
        try {
          const res = await fetch(url);
          const data = await res.json();
          return parser(data);
        } catch {
          return null;
        }
      };

      const resultado =
        (await tryFetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`, d => d.status === 1 && d.product)) ||
        (await tryFetch(`https://world.openbeautyfacts.org/api/v0/product/${codigo}.json`, d => d.status === 1 && d.product)) ||
        (await tryFetch(`https://world.openproductsfacts.org/api/v0/product/${codigo}.json`, d => d.status === 1 && d.product)) ||
        (await tryFetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`, d => d.items?.[0])) ||
        (await tryFetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${codigo}`, d => d.items?.[0]?.volumeInfo));

      if (resultado) {
        producto = {
          ...producto,
          nombre: resultado.product_name || resultado.title || "Sin nombre",
          marca: resultado.brands || resultado.brand || resultado.publisher || "-",
          imagen: resultado.image_small_url || resultado.images?.[0] || resultado.imageLinks?.thumbnail || "",
          datosExtra: JSON.stringify(resultado, null, 2)
        };
      }

      setProductos(prev => {
        if (prev.find(p => p.codigo === codigo)) return prev;
        return [...prev, producto];
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ==============================
  // ESCÁNER MEJORADO
  // ==============================
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    Quagga.init({
      inputStream: {
        type: "LiveStream",
        target: document.querySelector("#scanner"),
        constraints: isMobile
          ? { facingMode: "environment" }
          : { facingMode: "user" }
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
      },
      locate: true,
      frequency: 5
    }, err => {
      if (!err) Quagga.start();
    });

    Quagga.onDetected(data => {
      if (!escaneando) return;

      const codigo = data.codeResult.code;
      if (codigo.length < 8) return;

      const error = data.codeResult.decodedCodes?.[0]?.error;
      if (error && error > 0.2) return;

      if (codigo === ultimoCodigoRef.current) {
        contadorRef.current++;
      } else {
        ultimoCodigoRef.current = codigo;
        contadorRef.current = 1;
      }

      if (contadorRef.current >= 3) {
        fetchProducto(codigo);

        sonido.currentTime = 0;
        sonido.play().catch(() => {});

        setEscaneando(false);
        setTimeout(() => setEscaneando(true), 2000);

        contadorRef.current = 0;
        ultimoCodigoRef.current = null;
      }
    });

    return () => Quagga.stop();
  }, [escaneando]);

  // ==============================
  // EDITAR
  // ==============================
  const editar = (id, campo, valor) => {
    setProductos(productos.map(p =>
      p.id === id ? { ...p, [campo]: valor } : p
    ));
  };

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Scanner PRO</h1>

      <div className="flex gap-6">
        {/* CÁMARA PEQUEÑA */}
        <div className="relative">
          <div id="scanner" className="w-64 h-40 border rounded" />

          {/* MARCO CENTRAL */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-2 border-green-500 w-40 h-20" />
          </div>
        </div>

        {/* INFO */}
        <div>
          <p className="text-sm text-gray-600">
            Apunta al código dentro del recuadro
          </p>
        </div>
      </div>

      {/* TABLA */}
      <table className="w-full mt-6 border bg-white text-sm">
        <thead className="bg-green-500 text-white">
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Marca</th>
            <th>Imagen</th>
            <th>Datos</th>
          </tr>
        </thead>
        <tbody>
          {productos.map(p => (
            <tr key={p.id} className="border">
              <td>
                <input value={p.codigo} onChange={e => editar(p.id, "codigo", e.target.value)} />
              </td>
              <td>
                <input value={p.nombre} onChange={e => editar(p.id, "nombre", e.target.value)} />
              </td>
              <td>
                <input value={p.marca} onChange={e => editar(p.id, "marca", e.target.value)} />
              </td>
              <td>
                {p.imagen && <img src={p.imagen} width="40" />}
              </td>
              <td>
                <textarea
                  value={p.datosExtra}
                  onChange={e => editar(p.id, "datosExtra", e.target.value)}
                  className="w-40 h-20"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
