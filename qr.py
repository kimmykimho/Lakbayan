import qrcode

# Input link
link = input("Enter the link: ")

# Generate QR code
qr = qrcode.make(link)

# Save QR code as image
qr.save("qrcode.png")

print("QR code generated and saved as qrcode.png")
