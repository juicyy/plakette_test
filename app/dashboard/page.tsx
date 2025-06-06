'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
/*import { Card, CardContent } from "@/components/ui/card"*/
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, MoreHorizontal, Edit, Eye, Check, X, Sun, Moon, FileText } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { upload } from '@vercel/blob/client'
import React from 'react'
import '../styles/pdf-scrollbar.css'
import { Document, Page as PdfPage, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs-dist/build/pdf.worker.min.mjs`;

// Re-inserting the type definition and helper functions
type HeizungsplaketteItem = {
  id: number;
  datenschutzUndNutzungsbedingungen: boolean;
  einwilligungDatenverarbeitung: boolean;
  aufforderungSofortigeTaetigkeit: boolean;
  email: string;
  artDerImmobilie: string;
  artDerImmobilieSonstige: string;
  heizungsart: string;
  heizungsartSonstige: string;
  strasse: string;
  hausnummer: string;
  postleitzahl: string;
  ort: string;
  heizsystem: string;
  heizsystemSonstige: string;
  heizungshersteller: string;
  baujahr: number;
  typenbezeichnung: string;
  typenbezeichnungUnbekannt: boolean;
  heizungstechnik: string;
  heizungstechnikSonstige: string;
  energietraeger: string;
  energietraegerSonstige: string;
  energieausweis: string;
  energieausweisDate: string;
  vorname: string;
  nachname: string;
  personStrasse: string;
  personHausnummer: string;
  personPostleitzahl: string;
  personOrt: string;
  istEigentuemer: string;
  heizungsanlageFotos: string[];
  heizungsetiketteFotos: string[];
  heizungslabelFotos: string[];
  bedienungsanleitungFotos: string[];
  verzichtAufHeizungsanlageFotos: boolean;
  verzichtAufHeizungsetiketteFotos: boolean;
  verzichtAufHeizungslabelFotos: boolean;
  verzichtAufBedienungsanleitungFotos: boolean;
  status: string;
  pdfUrl?: string | null;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Ausstehend':
      return 'bg-yellow-200 text-yellow-800'
    case 'Genehmigt':
      return 'bg-green-200 text-green-800'
    case 'Abgelehnt':
      return 'bg-red-200 text-red-800'
    default:
      return 'bg-gray-200 text-gray-800'
  }
}

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen" suppressHydrationWarning={true}>
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
  </div>
);

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [heizungsplaketten, setHeizungsplaketten] = useState<HeizungsplaketteItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<HeizungsplaketteItem | null>(null)
  const [watchingItem, setWatchingItem] = useState<HeizungsplaketteItem | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [pdfGeneratingItemId, setPdfGeneratingItemId] = useState<number | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [imageRotations, setImageRotations] = useState<{ [url: string]: number }>({});
  const [regeneratingPdf, setRegeneratingPdf] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);

  useEffect(() => {
    // Authentication check
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
          const data = await response.json();
          if (data.isAuthenticated) {
            setIsAuthenticated(true);
          } else {
            router.push('/login');
          }
        } else {
          // Handle non-200 responses from auth status, e.g., server error
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to check auth status:', error);
        router.push('/login'); // Redirect on error as well
      }
    };
    checkAuth();
  }, [router]);

  const fetchHeizungsplaketten = useCallback(async () => {
    try {
      const response = await fetch('/api/heizungsplakette')
      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Daten')
      }
      const data: HeizungsplaketteItem[] = await response.json()
      setHeizungsplaketten(data.map(item => ({ ...item, pdfUrl: item.pdfUrl || null })));
    } catch (error) {
      console.error('Fehler beim Abrufen der Heizungsplaketten:', error)
      toast({
        title: "Fehler",
        description: "Die Heizungsplaketten konnten nicht geladen werden.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const heizungsplaketteResponse = await fetch('/api/heizungsplakette');
        if (!heizungsplaketteResponse.ok) {
          throw new Error('Netzwerkantwort war nicht ok für Heizungsplakette');
        }
        const data: HeizungsplaketteItem[] = await heizungsplaketteResponse.json();
        setHeizungsplaketten(data.map(item => ({ ...item, pdfUrl: item.pdfUrl || null })));
      } catch (error) {
        console.error('Fehler beim Abrufen der Daten:', error);
        toast({
          title: "Fehler",
          description: "Daten konnten nicht geladen werden.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const filteredHeizungsplaketten = heizungsplaketten.filter(item =>
    Object.values(item).some(value => 
      typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const handleEdit = (item: HeizungsplaketteItem) => {
    setEditingItem({ ...item })
  }

  const handleSave = async () => {
    if (editingItem) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/heizungsplakette/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editingItem),
        });

        if (!response.ok) {
          throw new Error('Fehler beim Speichern der Änderungen');
        }

        await fetchHeizungsplaketten();
        setEditingItem(null);
        toast({
          title: "Gespeichert",
          description: "Die Änderungen wurden erfolgreich gespeichert.",
        });
      } catch (error) {
        console.error('Fehler beim Speichern der Änderungen:', error);
        toast({
          title: "Fehler",
          description: "Die Änderungen konnten nicht gespeichert werden.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleWatch = (item: HeizungsplaketteItem) => {
    setWatchingItem(item)
  }

  const handleApprove = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/heizungsplakette/${id}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Genehmigung der Heizungsplakette');
      }

      await fetchHeizungsplaketten();
      toast({
        title: "Genehmigt",
        description: "Die Heizungsplakette wurde erfolgreich genehmigt.",
      });
    } catch (error) {
      console.error('Fehler bei der Genehmigung der Heizungsplakette:', error);
      toast({
        title: "Fehler",
        description: "Die Heizungsplakette konnte nicht genehmigt werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/heizungsplakette/${id}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Ablehnung der Heizungsplakette');
      }

      await fetchHeizungsplaketten();
      toast({
        title: "Abgelehnt",
        description: "Die Heizungsplakette wurde abgelehnt.",
      });
    } catch (error) {
      console.error('Fehler bei der Ablehnung der Heizungsplakette:', error);
      toast({
        title: "Fehler",
        description: "Die Heizungsplakette konnte nicht abgelehnt werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePdf = async (itemId: number) => {
    setPdfGeneratingItemId(itemId);
    setPdfPreviewUrl(null);
    try {
      const apiUrl = `/api/create_pdf?id=${itemId.toString()}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        let errorBody = `HTTP error ${response.status} (${response.statusText}) while fetching PDF from Python backend.`;
        try {
          const errorJson = await response.json(); 
          if (errorJson && errorJson.error) {
            errorBody = `PDF Generation Error (from Python): ${errorJson.error}`;
          } else {
             const text = await response.text(); 
             errorBody = text || errorBody; 
          }
        } catch (parseError) { 
            console.warn("Could not parse error response from /api/create_pdf", parseError);
            try { 
                const text = await response.text();
                errorBody = text || errorBody;
            } catch (textErr) {/* ignore */}
        }
        throw new Error(`${errorBody}`);
      }

      const pdfBlob = await response.blob(); 
      
      // Find the item for the given itemId
      const item = heizungsplaketten.find(p => String(p.id) === String(itemId));
      const oldUrl = item?.pdfUrl || '';
      // Define the desired path and filename in the blob store
      const blobPathname = `pdfs/heizungsplakette-${itemId}.pdf`;
      const localFileNameForFileObject = `heizungsplakette-${itemId}.pdf`;
      const pdfFile = new File([pdfBlob], localFileNameForFileObject, { type: 'application/pdf' });

      // Upload new PDF to Vercel Blob, pass oldUrl for deletion
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('oldUrl', oldUrl);
      formData.append('pathname', blobPathname);
      formData.append('itemId', String(itemId));
      const blobUploadResponse = await fetch('/api/blob-upload', {
        method: 'POST',
        body: formData,
      });
      if (!blobUploadResponse.ok) {
        const errorData = await blobUploadResponse.json().catch(() => ({ error: 'Unknown error uploading PDF' }));
        throw new Error(errorData.error || 'Fehler beim Hochladen des neuen PDFs');
      }
      const newBlobResult = await blobUploadResponse.json();
      // newBlobResult.url should be the new PDF URL

      // Retry logic for blob propagation
      let pdfAvailable = false;
      let tries = 0;
      const maxTries = 3;
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      while (!pdfAvailable && tries < maxTries) {
        try {
          const headResp = await fetch(newBlobResult.url, { method: 'HEAD' });
          if (headResp.ok) {
            pdfAvailable = true;
            break;
          }
        } catch (e) {}
        tries++;
        if (!pdfAvailable) await delay(1500);
      }
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      setHeizungsplaketten(prev => prev.map(p => String(p.id) === String(item.id) ? { ...p, pdfUrl: newBlobResult.url } : p));
      setPdfPreviewUrl(newBlobResult.url);
      toast({ 
        title: 'PDF neu generiert', 
        description: pdfAvailable ? 'Das PDF wurde mit den gewählten Rotationen neu erstellt und gespeichert.' : 'Das PDF wurde erstellt, aber ist eventuell noch nicht sofort verfügbar.' 
      });
    } catch (error: unknown) {
      let errorMessage = "Fehler bei der PDF-Generierung oder dem Upload.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("PDF Generation/Upload Error:", error);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPdfGeneratingItemId(null);
    }
  };

  const handlePreviewPdf = (url: string | null | undefined) => {
    if (url) {
      setPdfPreviewUrl(url);
    } else {
      toast({
        title: "Hinweis",
        description: "Für diesen Eintrag wurde noch kein PDF generiert oder gespeichert.",
        variant: "default",
      });
    }
  };

  // Helper to get all images for the current previewed item
  const getAllImagesForPreview = () => {
    const item = heizungsplaketten.find(p => p.pdfUrl === pdfPreviewUrl) || heizungsplaketten.find(p => String(p.id) === String(pdfPreviewUrl?.split('-')[1]));
    if (!item) return [];
    return [
      ...(item.heizungsanlageFotos || []).map((url: string) => ({ url, label: 'Foto zur Heizungsanlage' })),
      ...(item.heizungsetiketteFotos || []).map((url: string) => ({ url, label: 'Foto zum Typenschild' })),
      ...(item.heizungslabelFotos || []).map((url: string) => ({ url, label: 'Foto zum Heizungslabel' })),
      ...(item.bedienungsanleitungFotos || []).map((url: string) => ({ url, label: 'Foto zur Bedienungsanleitung' })),
    ];
  };

  const handleSetRotation = (url: string, deg: number) => {
    setImageRotations(prev => ({ ...prev, [url]: deg }));
  };

  const handleRegeneratePdf = async () => {
    const item = heizungsplaketten.find(p => p.pdfUrl === pdfPreviewUrl);
    if (!item) return;
    setRegeneratingPdf(true);
    try {
      // Debug log
      console.log('Sending image_rotations:', imageRotations);
      // Send image_rotations as JSON in POST body
      const response = await fetch(`/api/create_pdf?id=${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_rotations: imageRotations, id: item.id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error generating PDF' }));
        throw new Error(errorData.error || 'Fehler beim PDF-Update');
      }

      // Check if the response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        console.error('Invalid response type:', contentType);
        throw new Error('Server returned invalid response type. Expected PDF.');
      }

      const pdfBlob = await response.blob();
      
      // Verify the blob is actually a PDF
      if (pdfBlob.type !== 'application/pdf') {
        console.error('Invalid blob type:', pdfBlob.type);
        throw new Error('Received invalid file type. Expected PDF.');
      }

      // Use the same blob name as the original for regeneration
      const blobPathname = `pdfs/heizungsplakette-${item.id}.pdf`;
      const pdfFile = new File([pdfBlob], `heizungsplakette-${item.id}.pdf`, { type: 'application/pdf' });
      const oldUrl = item.pdfUrl || '';
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('oldUrl', oldUrl);
      formData.append('pathname', blobPathname);
      formData.append('itemId', String(item.id));
      let blobUploadResponse;
      try {
        blobUploadResponse = await fetch('/api/blob-upload', {
          method: 'POST',
          body: formData,
        });
      } catch (uploadErr) {
        console.error('Blob upload failed:', uploadErr);
        toast({
          title: 'Fehler',
          description: 'Fehler beim Hochladen des neuen PDFs (Netzwerkfehler).',
          variant: 'destructive',
        });
        setRegeneratingPdf(false);
        return;
      }
      if (!blobUploadResponse.ok) {
        const errorData = await blobUploadResponse.json().catch(() => ({ error: 'Unknown error uploading PDF' }));
        console.error('Blob upload error:', errorData);
        toast({
          title: 'Fehler',
          description: errorData.error || 'Fehler beim Hochladen des neuen PDFs',
          variant: 'destructive',
        });
        setRegeneratingPdf(false);
        return;
      }
      const newBlobResult = await blobUploadResponse.json();
      // newBlobResult.url should be the new PDF URL

      // Retry logic for blob propagation
      let pdfAvailable = false;
      let tries = 0;
      const maxTries = 3;
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      while (!pdfAvailable && tries < maxTries) {
        try {
          const headResp = await fetch(newBlobResult.url, { method: 'HEAD' });
          if (headResp.ok) {
            pdfAvailable = true;
            break;
          }
        } catch (e) {}
        tries++;
        if (!pdfAvailable) await delay(1500);
      }
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      setHeizungsplaketten(prev => prev.map(p => String(p.id) === String(item.id) ? { ...p, pdfUrl: newBlobResult.url } : p));
      setPdfPreviewUrl(newBlobResult.url);
      toast({ 
        title: 'PDF neu generiert', 
        description: pdfAvailable ? 'Das PDF wurde mit den gewählten Rotationen neu erstellt und gespeichert.' : 'Das PDF wurde erstellt, aber ist eventuell noch nicht sofort verfügbar.' 
      });
    } catch (e: unknown) {
      console.error('Error during PDF regeneration:', e);
      const errorMessage = e instanceof Error ? e.message : 'PDF konnte nicht neu generiert werden.';
      toast({ 
        title: 'Fehler', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      setRegeneratingPdf(false);
    }
  };

  if (isAuthenticated === null) {
    return <LoadingSpinner />; // Or any other loading indicator
  }
  if (!isAuthenticated) {
     return <LoadingSpinner />; // Or a message like "Redirecting to login..."
  }

  const currentLogo = theme === 'dark' ? '/images/heizungsplakette-logo-hell.png' : '/images/heizungsplakette-logo.png';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning={true}>
      <div className="w-64 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 flex flex-col justify-between items-center border-r border-gray-200 dark:border-gray-700">
        <div>
          <div className="mb-8">
            <Image src={currentLogo} alt="Heizungsplakette Logo" width={220} height={55} className="mb-4" priority />
          </div>
        </div>
        <div className="flex items-center justify-start space-x-3">
          <Button onClick={handleLogout} variant="ghost" className="px-4 dark:text-gray-300 dark:hover:bg-gray-700/50">
            Abmelden
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full p-2 flex items-center justify-center dark:text-gray-300 dark:hover:bg-gray-700/50"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 z-10" />
            <Input
              type="search"
              placeholder="Suche..."
              className="pl-11 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm dark:text-gray-200 dark:border-gray-700 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="show-details"
              checked={showDetails}
              onCheckedChange={setShowDetails}
              className="data-[state=checked]:bg-blue-500"
            />
            <Label htmlFor="show-details" className="text-gray-600 dark:text-gray-300">Details anzeigen</Label>
          </div>
        </div>

        {/* PDF Preview Section */} 
        <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => {
          if (!open) {
            setPdfPreviewUrl(null);
            setNumPages(null);
          }
        }}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-row overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <div className="flex-1 min-w-0 max-h-[90vh] overflow-auto p-8 bg-white dark:bg-gray-900 pdf-preview-scroll flex flex-col items-center">
              {pdfPreviewUrl && (
                 <div className="w-full">
                  <Document
                    file={pdfPreviewUrl}
                    onLoadSuccess={({ numPages: nextNumPages }) => setNumPages(nextNumPages)}
                    onLoadError={(error) => {
                        console.error('Error while loading PDF:', error);
                        toast({ title: "Fehler beim Laden des PDFs", description: error.message, variant: "destructive" });
                        setPdfPreviewUrl(null);
                    }}
                    loading={<div className="flex justify-center items-center h-64"><p>PDF wird geladen...</p></div>}
                    noData={<p>Keine PDF-Datei zum Anzeigen vorhanden.</p>}
                  >
                    {Array.from(new Array(numPages || 0), (el, index) => (
                      <PdfPage 
                        key={`page_${index + 1}`}
                        pageNumber={index + 1} 
                        renderTextLayer={false} 
                        renderAnnotationLayer={false} 
                        width={typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.4, 650) : 650}
                        className="mb-4 shadow-lg"
                      />
                    ))}
                  </Document>
                </div>
              )}
            </div>
            <div className="w-[420px] max-w-[40vw] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto p-6 flex flex-col gap-4 pdf-rotation-scroll">
              {getAllImagesForPreview().map(({ url, label }: { url: string; label: string }, index: number) => (
                <div key={url} className="border p-3 rounded-lg mb-3 shadow-sm dark:border-gray-600 bg-white dark:bg-gray-800 w-full">
                  <div className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-300">{label} {index + 1}</div>
                  <div className="relative w-full h-40 md:h-48 mb-3 bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden rounded-md">
                    <Image
                      src={url}
                      alt={`${label} ${index + 1}`}
                      width={300} 
                      height={225} 
                      className="max-w-full max-h-full object-contain"
                      style={{ transform: `rotate(${imageRotations[url] || 0}deg)` }}
                    />
                  </div>
                  <div className="flex gap-2 justify-between">
                    {[0, 90, 180, 270].map(deg => (
                      <Button
                        key={deg}
                        variant={(imageRotations[url] || 0) === deg ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSetRotation(url, deg)}
                        className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {deg}°
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                onClick={handleRegeneratePdf}
                disabled={regeneratingPdf}
                className="mt-4 w-full dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white flex items-center justify-center"
              >
                {regeneratingPdf && (
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                )}
                {regeneratingPdf ? 'PDF wird neu generiert...' : 'PDF neu generieren'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="border rounded-2xl overflow-hidden bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="dark:text-gray-300 font-medium">Art der Immobilie</TableHead>
                <TableHead className="dark:text-gray-300 font-medium">Heizungsart</TableHead>
                <TableHead className="dark:text-gray-300 font-medium">Status</TableHead>
                <TableHead className="dark:text-gray-300 font-medium">E-Mail</TableHead>
                {showDetails && (
                  <>
                    <TableHead className="dark:text-gray-300 font-medium">Vorname</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Nachname</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Straße</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Hausnummer</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">PLZ</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Ort</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Heizungshersteller</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Baujahr</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Heizsystem</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Heizungstechnik</TableHead>
                    <TableHead className="dark:text-gray-300 font-medium">Energieträger</TableHead>
                  </>
                )}
                <TableHead className="dark:text-gray-300 font-medium">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHeizungsplaketten.map((item) => (
                <TableRow key={item.id} className="dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                  <TableCell className="dark:text-gray-300">{item.artDerImmobilie}</TableCell>
                  <TableCell className="dark:text-gray-300">{item.heizungsart}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="dark:text-gray-300">{item.email}</TableCell>
                  {showDetails && (
                    <>
                      <TableCell className="dark:text-gray-300">{item.vorname}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.nachname}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.strasse}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.hausnummer}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.postleitzahl}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.ort}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.heizungshersteller}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.baujahr}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.heizsystem}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.heizungstechnik}</TableCell>
                      <TableCell className="dark:text-gray-300">{item.energietraeger}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 dark:text-gray-300 dark:hover:bg-gray-700/50">
                          <span className="sr-only">Menü öffnen</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-gray-800/95 dark:border-gray-700 backdrop-blur-sm">
                        <DropdownMenuItem onClick={() => handleEdit(item)} className="dark:text-gray-300 dark:hover:bg-gray-700/50">
                          <Edit className="mr-2 h-4 w-4" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleWatch(item)} className="dark:text-gray-300 dark:hover:bg-gray-700/50">
                          <Eye className="mr-2 h-4 w-4" />
                          Beobachten
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGeneratePdf(item.id)}
                          disabled={pdfGeneratingItemId === item.id || !!item.pdfUrl}
                          className="dark:text-gray-300 dark:hover:bg-gray-700/50"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {pdfGeneratingItemId === item.id ? 'Generiere PDF...' : item.pdfUrl ? 'PDF neu generieren' : 'PDF generieren'}
                        </DropdownMenuItem>
                        {item.pdfUrl && (
                          <DropdownMenuItem onClick={() => handlePreviewPdf(item.pdfUrl)} className="dark:text-gray-300 dark:hover:bg-gray-700/50">
                          <Eye className="mr-2 h-4 w-4" />
                            PDF anzeigen
                        </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="dark:text-gray-200">Heizungsplakette bearbeiten</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="artDerImmobilie" className="dark:text-gray-300">Art der Immobilie</Label>
                    <Select
                      value={editingItem.artDerImmobilie}
                      onValueChange={(value) => setEditingItem({...editingItem, artDerImmobilie: value})}
                    >
                      <SelectTrigger className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Wählen Sie die Art der Immobilie" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                        <SelectItem value="Einfamilienhaus" className="dark:hover:bg-gray-700">Einfamilienhaus</SelectItem>
                        <SelectItem value="Mehrfamilienhaus" className="dark:hover:bg-gray-700">Mehrfamilienhaus</SelectItem>
                        <SelectItem value="Doppelhaushälfte" className="dark:hover:bg-gray-700">Doppelhaushälfte</SelectItem>
                        <SelectItem value="Reihenhaus" className="dark:hover:bg-gray-700">Reihenhaus</SelectItem>
                        <SelectItem value="Sonstige" className="dark:hover:bg-gray-700">Sonstige</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="heizungsart" className="dark:text-gray-300">Heizungsart</Label>
                    <Select
                      value={editingItem.heizungsart}
                      onValueChange={(value) => setEditingItem({...editingItem, heizungsart: value})}
                    >
                      <SelectTrigger className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Wählen Sie die Heizungsart" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                        <SelectItem value="Gasheizung" className="dark:hover:bg-gray-700">Gasheizung</SelectItem>
                        <SelectItem value="Öl Heizung" className="dark:hover:bg-gray-700">Öl Heizung</SelectItem>
                        <SelectItem value="Wärmepumpe" className="dark:hover:bg-gray-700">Wärmepumpe</SelectItem>
                        <SelectItem value="Fernwärme" className="dark:hover:bg-gray-700">Fernwärme</SelectItem>
                        <SelectItem value="Sonstige" className="dark:hover:bg-gray-700">Sonstige</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="email" className="dark:text-gray-300">E-Mail</Label>
                    <Input
                      id="email"
                      value={editingItem.email}
                      onChange={(e) => setEditingItem({...editingItem, email: e.target.value})}
                      className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vorname" className="dark:text-gray-300">Vorname</Label>
                    <Input
                      id="vorname"
                      value={editingItem.vorname}
                      onChange={(e) => setEditingItem({...editingItem, vorname: e.target.value})}
                      className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nachname">Nachname</Label>
                    <Input
                      id="nachname"
                      value={editingItem.nachname}
                      onChange={(e) => setEditingItem({...editingItem, nachname: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="strasse">Straße</Label>
                    <Input
                      id="strasse"
                      value={editingItem.strasse}
                      onChange={(e) => setEditingItem({...editingItem, strasse: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hausnummer">Hausnummer</Label>
                    <Input
                      id="hausnummer"
                      value={editingItem.hausnummer}
                      onChange={(e) => setEditingItem({...editingItem, hausnummer: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postleitzahl">PLZ</Label>
                    <Input
                      id="postleitzahl"
                      value={editingItem.postleitzahl}
                      onChange={(e) => setEditingItem({...editingItem, postleitzahl: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ort">Ort</Label>
                    <Input
                      id="ort"
                      value={editingItem.ort}
                      onChange={(e) => setEditingItem({...editingItem, ort: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="heizungshersteller">Heizungshersteller</Label>
                    <Input
                      id="heizungshersteller"
                      value={editingItem.heizungshersteller}
                      onChange={(e) => setEditingItem({...editingItem, heizungshersteller: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="baujahr">Baujahr</Label>
                    <Input
                      id="baujahr"
                      type="number"
                      value={editingItem.baujahr}
                      onChange={(e) => setEditingItem({...editingItem, baujahr: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="heizsystem">Heizsystem</Label>
                    <Input
                      id="heizsystem"
                      value={editingItem.heizsystem}
                      onChange={(e) => setEditingItem({...editingItem, heizsystem: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="heizungstechnik">Heizungstechnik</Label>
                    <Input
                      id="heizungstechnik"
                      value={editingItem.heizungstechnik}
                      onChange={(e) => setEditingItem({...editingItem, heizungstechnik: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="energietraeger">Energieträger</Label>
                    <Input
                      id="energietraeger"
                      value={editingItem.energietraeger}
                      onChange={(e) => setEditingItem({...editingItem, energietraeger: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="typenbezeichnung">Typenbezeichnung</Label>
                    <Input
                      id="typenbezeichnung"
                      value={editingItem.typenbezeichnung}
                      onChange={(e) => setEditingItem({...editingItem, typenbezeichnung: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="typenbezeichnungUnbekannt"
                      checked={editingItem.typenbezeichnungUnbekannt}
                      onCheckedChange={(checked) => setEditingItem({...editingItem, typenbezeichnungUnbekannt: checked as boolean})}
                    />
                    <Label htmlFor="typenbezeichnungUnbekannt">Typenbezeichnung unbekannt</Label>
                  </div>
                  <div>
                    <Label htmlFor="energieausweis">Energieausweis</Label>
                    <Input
                      id="energieausweis"
                      value={editingItem.energieausweis}
                      onChange={(e) => setEditingItem({...editingItem, energieausweis: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="energieausweisDate">Energieausweis Datum</Label>
                    <Input
                      id="energieausweisDate"
                      type="date"
                      value={editingItem.energieausweisDate}
                      onChange={(e) => setEditingItem({...editingItem, energieausweisDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="istEigentuemer">Ist Eigentümer</Label>
                    <Select
                      value={editingItem.istEigentuemer}
                      onValueChange={(value) => setEditingItem({...editingItem, istEigentuemer: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wählen Sie den Eigentümerstatus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ja">Ja</SelectItem>
                        <SelectItem value="Nein">Nein</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="datenschutzUndNutzungsbedingungen"
                      checked={editingItem.datenschutzUndNutzungsbedingungen}
                      onCheckedChange={(checked) => setEditingItem({...editingItem, datenschutzUndNutzungsbedingungen: checked as boolean})}
                    />
                    <Label htmlFor="datenschutzUndNutzungsbedingungen">Datenschutz und Nutzungsbedingungen</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="einwilligungDatenverarbeitung"
                      checked={editingItem.einwilligungDatenverarbeitung}
                      onCheckedChange={(checked) => setEditingItem({...editingItem, einwilligungDatenverarbeitung: checked as boolean})}
                    />
                    <Label htmlFor="einwilligungDatenverarbeitung">Einwilligung Datenverarbeitung</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="aufforderungSofortigeTaetigkeit"
                      checked={editingItem.aufforderungSofortigeTaetigkeit}
                      onCheckedChange={(checked) => setEditingItem({...editingItem, aufforderungSofortigeTaetigkeit: checked as boolean})}
                    />
                    <Label htmlFor="aufforderungSofortigeTaetigkeit">Aufforderung sofortige Tätigkeit</Label>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleSave} disabled={isLoading} className="dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white">
                {isLoading ? 'Wird gespeichert...' : 'Speichern'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={watchingItem !== null} onOpenChange={() => setWatchingItem(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="dark:text-gray-200">Heizungsplakette Details</DialogTitle>
            </DialogHeader>
            {watchingItem && (
              <Tabs defaultValue="seite1" className="w-full">
                <TabsList>
                  <TabsTrigger value="seite1">Seite 1</TabsTrigger>
                  <TabsTrigger value="seite2">Seite 2</TabsTrigger>
                  <TabsTrigger value="seite3">Seite 3</TabsTrigger>
                </TabsList>
                <TabsContent value="seite1">
                  <div className="grid gap-4 py-4">
                    <div><strong>Art der Immobilie:</strong> {watchingItem.artDerImmobilie}</div>
                    <div><strong>Heizungsart:</strong> {watchingItem.heizungsart}</div>
                    <div><strong>E-Mail:</strong> {watchingItem.email}</div>
                    <div><strong>Status:</strong> {watchingItem.status}</div>
                    <div><strong>Vorname:</strong> {watchingItem.vorname}</div>
                    <div><strong>Nachname:</strong> {watchingItem.nachname}</div>
                    <div><strong>Straße:</strong> {watchingItem.strasse}</div>
                    <div><strong>Hausnummer:</strong> {watchingItem.hausnummer}</div>
                    <div><strong>PLZ:</strong> {watchingItem.postleitzahl}</div>
                    <div><strong>Ort:</strong> {watchingItem.ort}</div>
                    <div><strong>Heizungshersteller:</strong> {watchingItem.heizungshersteller}</div>
                    <div><strong>Baujahr:</strong> {watchingItem.baujahr}</div>
                    <div><strong>Heizsystem:</strong> {watchingItem.heizsystem}</div>
                    <div><strong>Heizungstechnik:</strong> {watchingItem.heizungstechnik}</div>
                    <div><strong>Energieträger:</strong> {watchingItem.energietraeger}</div>
                  </div>
                </TabsContent>
                <TabsContent value="seite2">
                  <div className="grid gap-4 py-4">
                    <div><strong>Typenbezeichnung:</strong> {watchingItem.typenbezeichnung}</div>
                    <div><strong>Typenbezeichnung unbekannt:</strong> {watchingItem.typenbezeichnungUnbekannt ? 'Ja' : 'Nein'}</div>
                    <div><strong>Energieausweis:</strong> {watchingItem.energieausweis}</div>
                    <div><strong>Energieausweis Datum:</strong> {watchingItem.energieausweisDate}</div>
                    <div><strong>Ist Eigentümer:</strong> {watchingItem.istEigentuemer}</div>
                    <div><strong>Datenschutz und Nutzungsbedingungen:</strong> {watchingItem.datenschutzUndNutzungsbedingungen ? 'Ja' : 'Nein'}</div>
                    <div><strong>Einwilligung Datenverarbeitung:</strong> {watchingItem.einwilligungDatenverarbeitung ? 'Ja' : 'Nein'}</div>
                    <div><strong>Aufforderung sofortige Tätigkeit:</strong> {watchingItem.aufforderungSofortigeTaetigkeit ? 'Ja' : 'Nein'}</div>
                  </div>
                </TabsContent>
                <TabsContent value="seite3">
                  <div className="grid gap-4 py-4">
                    <div><strong>Verzicht auf Heizungsanlage Fotos:</strong> {watchingItem.verzichtAufHeizungsanlageFotos ? 'Ja' : 'Nein'}</div>
                    <div><strong>Verzicht auf Heizungsetikette Fotos:</strong> {watchingItem.verzichtAufHeizungsetiketteFotos ? 'Ja' : 'Nein'}</div>
                    <div><strong>Verzicht auf Heizungslabel Fotos:</strong> {watchingItem.verzichtAufHeizungslabelFotos ? 'Ja' : 'Nein'}</div>
                    <div><strong>Verzicht auf Bedienungsanleitung Fotos:</strong> {watchingItem.verzichtAufBedienungsanleitungFotos ? 'Ja' : 'Nein'}</div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}