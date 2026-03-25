import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET Orders Error", error);
    return NextResponse.json({ message: "Error fetching orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { items, shippingAddress } = body as {
      items: Array<{ id: string; quantity: number; price: number }>;
      shippingAddress: string;
    };

    // Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }
    if (!shippingAddress || typeof shippingAddress !== "string" || shippingAddress.trim().length < 5) {
      return NextResponse.json({ message: "A valid shipping address is required" }, { status: 400 });
    }

    // Verify products exist and have sufficient stock
    const productIds = items.map((i) => i.id);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== items.length) {
      return NextResponse.json({ message: "One or more products not found" }, { status: 400 });
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.id);
      if (!product || product.stock < item.quantity) {
        return NextResponse.json(
          { message: `Insufficient stock for "${product?.name ?? item.id}"` },
          { status: 400 }
        );
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create the order and decrement stock in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: session.user!.id!,
          totalAmount,
          shippingAddr: shippingAddress.trim(),
          status: "PENDING",
          items: {
            create: items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      // Decrement stock for each product
      for (const item of items) {
        await tx.product.update({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ message: "Order placed successfully", orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error("POST Orders Error", error);
    return NextResponse.json({ message: "Error creating order" }, { status: 500 });
  }
}
