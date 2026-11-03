export default function DocumentLogo({ propertyName }: { propertyName: string }) {
  if (propertyName?.trim().toLowerCase() !== 'mozza beach resort') return null;
  return <img src="/mozza-beach-logo.png" alt="Mozza Beach Resort" width={180} height={136}
    style={{ display: 'block', width: '180px', maxWidth: '100%', height: 'auto', objectFit: 'contain', margin: '0 auto 16px', breakInside: 'avoid' }} />;
}
