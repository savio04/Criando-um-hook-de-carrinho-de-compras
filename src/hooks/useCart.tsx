import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

type RequestProducts = Omit<Product, "amount">;

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  const [stock, setStock] = useState<Stock[]>(() => {
    api.get("/stock").then((response) => setStock(response.data));
    return [];
  });
  const [products, setProducts] = useState<RequestProducts[]>(() => {
    api.get("/products").then((response) => setProducts(response.data));
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //Buscando produto no carrinho
      const productExistingIndex = cart.findIndex(
        (cart) => cart.id === productId
      );
      if (productExistingIndex !== -1) {
        //buscando a quantidade desse produto no estoque
        const stockProduct = stock.find(
          (stock) => stock.id === cart[productExistingIndex].id
        ) as Stock;
        if (stockProduct.amount > cart[productExistingIndex].amount) {
          cart[productExistingIndex].amount += 1;
          localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart]));

          setCart([...cart]);
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
        //Caso ele entre nesse if, a execução dessa função para no fim do if.
        return;
      }
      //Adiciona novo produto ao carrinho caso não exista
      const product = products.find((product) => product.id === productId);

      const newProduct = { ...product, amount: 1 } as Product;
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify([...cart, newProduct])
      );
      setCart([...cart, newProduct]);
    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );
      if (productIndex !== -1) {
        cart.splice(productIndex, 1);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart]));

        setCart([...cart]);
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );
      const stockProduct = stock.find(
        (stock) => stock.id === cart[productIndex].id
      ) as Stock;

      if (!(stockProduct.amount >= amount)) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      cart[productIndex].amount = amount
      localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart]));

      setCart([...cart]);

    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
