import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Camera, Upload, X, Loader2, User, Crop as CropIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AvatarUploadWithCropProps {
  currentImage?: string | null;
  onImageChange: (url: string | null) => void;
  userName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Set canvas size to the crop size
  const outputSize = 256; // Output square size
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.imageSmoothingQuality = 'high';

  const sourceX = crop.x * scaleX;
  const sourceY = crop.y * scaleY;
  const sourceWidth = crop.width * scaleX;
  const sourceHeight = crop.height * scaleY;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.9,
    );
  });
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
  xl: 'h-36 w-36',
};

export function AvatarUploadWithCrop({
  currentImage,
  onImageChange,
  userName = '',
  size = 'lg',
}: AvatarUploadWithCropProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, GIF).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB for original)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result?.toString() || null);
      setCropDialogOpen(true);
    });
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // Upload to Supabase Storage
      const fileName = `avatars/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const imageUrl = data.publicUrl;
      setPreviewUrl(imageUrl);
      onImageChange(imageUrl);
      setCropDialogOpen(false);
      setImageSrc(null);

      toast({
        title: 'Photo uploaded',
        description: 'Your profile photo has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageChange(null);
  };

  const handleCancelCrop = () => {
    setCropDialogOpen(false);
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        {/* Avatar with overlay */}
        <div className="relative group">
          <Avatar className={cn(
            sizeClasses[size],
            'ring-4 ring-primary/10 shadow-lg transition-all duration-300 group-hover:ring-primary/20'
          )}>
            <AvatarImage src={previewUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold text-xl">
              {initials || <User className="h-8 w-8 text-muted-foreground" />}
            </AvatarFallback>
          </Avatar>
          
          {/* Camera overlay button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-full',
              'bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
              'cursor-pointer'
            )}
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
          
          {/* Status indicator */}
          {previewUrl && (
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {previewUrl ? 'Change Photo' : 'Upload Photo'}
          </Button>
          
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveImage}
              className="text-muted-foreground hover:text-destructive gap-2"
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground text-center max-w-48">
            JPG, PNG or GIF. Max 10MB. Square crop recommended.
          </p>
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="h-5 w-5 text-primary" />
              Crop Your Photo
            </DialogTitle>
            <DialogDescription>
              Drag to position and resize the crop area for your profile picture.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            {imageSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                className="max-h-80 rounded-lg overflow-hidden"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageSrc}
                  onLoad={onImageLoad}
                  className="max-h-80 w-auto"
                />
              </ReactCrop>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelCrop}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropComplete}
              disabled={uploading || !completedCrop}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Save Photo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
