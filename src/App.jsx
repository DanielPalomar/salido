import { useEffect, useState } from "react";
import Quagga from "quagga";

export default function App() {
  const [productos, setProductos] = useState([]);

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

      const resFood = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${codigo}.json`
      );
      const dataFood = await resFood.json();

      if (dataFood.status === 1) {
        const p = dataFood.product;
        producto = {
          ...producto,
          nombre: p.product_name || "Sin nombre",
          marca: p.brands || "Sin marca",
          imagen: p.image_small_url || "",
          datosExtra: JSON.stringify(p, null, 2)
        };
      } else {
        const resUPC = await fetch(
          `https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`
        );
        const dataUPC = await resUPC.json();

        if (dataUPC.items && dataUPC.items.length > 0) {
          const p = dataUPC.items[0];
          producto = {
            ...producto,
            nombre: p.title || "Sin nombre",
            marca: p.brand || "Sin marca",
            imagen: p.images?.[0] || "",
            datosExtra: JSON.stringify(p, null, 2)
          };
        }
      }

      setProductos((prev) => {
        if (prev.find((x) => x.codigo === codigo)) return prev;
        return [...prev, producto];
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const constraints = isMobile
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment"
        }
      : {
          width: 640,
          height: 480,
          facingMode: "user"
        };

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: document.querySelector("#scanner"),
          constraints
        },
        locator: {
          patchSize: isMobile ? "large" : "medium",
          halfSample: true
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
        },
        locate: true
      },
      (err) => {
        if (err) {
          console.error("Error iniciando cámara:", err);
          return;
        }
        Quagga.start();
      }
    );

    Quagga.onDetected((data) => {
      const codigo = data.codeResult.code;
      fetchProducto(codigo);
    });

    return () => {
      Quagga.stop();
    };
  }, []);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      Quagga.decodeSingle(
        {
          src: reader.result,
          numOfWorkers: 0,
          inputStream: { size: 800 },
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
          }
        },
        (result) => {
          if (result && result.codeResult) {
            const codigo = result.codeResult.code;
            fetchProducto(codigo);
          } else {
            alert("No se detectó ningún código");
          }
        }
      );
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-700 mb-6">
          Scanner de Productos
        </h1>

        <div className="bg-white p-4 rounded-2xl shadow mb-6">
          <input
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="mb-4"
          />

          <div
            id="scanner"
            className="w-full h-[300px] rounded-xl overflow-hidden border"
          />
        </div>

        <div className="bg-white rounded-2xl shadow overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-emerald-600 text-white">
              <tr>
                <th className="p-2">Código de barras</th>
                <th className="p-2">Nombre</th>
                <th className="p-2">Marca</th>
                <th className="p-2">Imagen</th>
                <th className="p-2">Datos</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr
                  key={p.id}
                  className="border-b hover:bg-emerald-50 transition"
                >
                  <td className="p-2">{p.codigo}</td>
                  <td className="p-2">{p.nombre}</td>
                  <td className="p-2">{p.marca}</td>
                  <td className="p-2">
                    {p.imagen && (
                      <img
                        src={p.imagen}
                        alt=""
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                  </td>
                  <td className="p-2">
                    <pre className="max-w-xs max-h-40 overflow-auto text-xs bg-gray-100 p-2 rounded">
                      {p.datosExtra}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
