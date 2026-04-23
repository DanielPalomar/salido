import { useEffect, useState } from "react";
import Quagga from "quagga";

export default function App() {
  // Ahora guardamos objetos completos de producto
  // { id, codigo, nombre, marca, imagen }
  const [productos, setProductos] = useState([]);

  // ==============================
  // FUNCIÓN: OBTENER DATOS REALES
  // ==============================
  const fetchProducto = async (codigo) => {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${codigo}.json`
      );
      const data = await res.json();

      if (data.status === 1) {
        const p = data.product;

        const producto = {
          id: Date.now(),
          codigo,
          nombre: p.product_name || "Sin nombre",
          marca: p.brands || "Sin marca",
          imagen: p.image_small_url || ""
        };

        setProductos((prev) => {
          if (prev.find((x) => x.codigo === codigo)) return prev;
          return [...prev, producto];
        });
      } else {
        // Si no existe en la API
        setProductos((prev) => {
          if (prev.find((x) => x.codigo === codigo)) return prev;
          return [
            ...prev,
            {
              id: Date.now(),
              codigo,
              nombre: "No encontrado",
              marca: "-",
              imagen: ""
            }
          ];
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==============================
  // ESCANEO CON CÁMARA
  // ==============================
  useEffect(() => {
    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: document.querySelector("#scanner"),
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment"
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "code_128_reader"
          ]
        },
        locate: true
      },
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        Quagga.start();
      }
    );

    Quagga.onDetected((data) => {
      const codigo = data.codeResult.code;
      fetchProducto(codigo); // 🔥 aquí pedimos datos reales
    });

    return () => {
      Quagga.stop();
    };
  }, []);

  // ==============================
  // ESCANEO DESDE IMAGEN
  // ==============================
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
            readers: [
              "ean_reader",
              "ean_8_reader",
              "code_128_reader"
            ]
          }
        },
        (result) => {
          if (result && result.codeResult) {
            const codigo = result.codeResult.code;
            fetchProducto(codigo); // 🔥 también aquí
          } else {
            alert("No se detectó ningún código");
          }
        }
      );
    };

    reader.readAsDataURL(file);
  };

  // ==============================
  // TEST MANUAL
  // ==============================
  /*
  useEffect(() => {
    fetchProducto("8410376054033");
  }, []);
  */

  return (
    <div>
      <h2>Scanner código de barras</h2>

      <input type="file" accept="image/*" onChange={handleImage} />

      <div
        id="scanner"
        style={{ width: "640px", height: "480px", border: "1px solid black" }}
      />

      {/* TABLA CON DATOS REALES */}
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Marca</th>
            <th>Imagen</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <td>{p.codigo}</td>
              <td>{p.nombre}</td>
              <td>{p.marca}</td>
              <td>
                {p.imagen && (
                  <img src={p.imagen} alt="" width="50" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
