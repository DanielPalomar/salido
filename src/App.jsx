import { useEffect, useState } from "react";
import Quagga from "quagga";

export default function App() {
  const [productos, setProductos] = useState([]);

  // ==============================
  // FETCH UNIVERSAL (VARIAS APIs)
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

      // API 1: alimentos
      const resFood = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`);
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
        // API 2: productos generales
        const resUPC = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`);
        const dataUPC = await resUPC.json();

        if (dataUPC.items?.length) {
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

  // ==============================
  // ESCÁNER
  // ==============================
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: document.querySelector("#scanner"),
          constraints: isMobile
            ? { facingMode: "environment" }
            : { facingMode: "user" }
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
        }
      },
      (err) => {
        if (!err) Quagga.start();
      }
    );

    Quagga.onDetected((data) => {
      fetchProducto(data.codeResult.code);
    });

    return () => Quagga.stop();
  }, []);

  // ==============================
  // EDITAR TABLA
  // ==============================
  const editar = (id, campo, valor) => {
    setProductos(productos.map(p =>
      p.id === id ? { ...p, [campo]: valor } : p
    ));
  };

  // ==============================
  // SUBIR IMAGEN
  // ==============================
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      Quagga.decodeSingle(
        {
          src: reader.result,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
          }
        },
        (result) => {
          if (result?.codeResult) {
            fetchProducto(result.codeResult.code);
          } else {
            alert("No se detectó código");
          }
        }
      );
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Scanner</h1>

      {/* CAMARA PEQUEÑA */}
      <div className="mb-4">
        <div id="scanner" className="w-64 h-40 border rounded" />
      </div>

      {/* SUBIR IMAGEN */}
      <input type="file" accept="image/*" onChange={handleImage} className="mb-4" />

      {/* TABLA EDITABLE */}
      <table className="w-full border bg-white">
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
          {productos.map((p) => (
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
