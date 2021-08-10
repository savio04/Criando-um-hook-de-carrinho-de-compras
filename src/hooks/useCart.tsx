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

  const addProduct = async (productId: number) => {
    try {
      //Buscando produto no carrinho
      const updateCart = [...cart];
      const productExisting = updateCart.find((cart) => cart.id === productId);
      const stockProduct = await api.get(`/stock/${productId}`);
      const amountProductCart = productExisting
        ? productExisting.amount + 1
        : 0;

      if (stockProduct.data.amount < amountProductCart) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExisting) {
        productExisting.amount = amountProductCart;
      } else {
        const productRequest = await api.get(`products/${productId}`);
        const newProduct = { ...productRequest.data, amount: 1 } as Product;
        updateCart.push(newProduct);
      }

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateCart));
      setCart(updateCart);
    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updateCart = [...cart];
      const productExistingIndex = updateCart.findIndex(
        (product) => product.id === productId
      );
      if (productExistingIndex !== -1) {
        updateCart.splice(productExistingIndex, 1);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateCart));
        setCart(updateCart);
      } else {
        toast.error("Erro na remoção do produto");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stockRequest = await api.get(`/stock/${productId}`);
      const stockAmount = stockRequest.data.amount;
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (!(stockAmount >= amount)) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      cart[productIndex].amount = amount;
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
