import {
  Card,
  Button,
  Image,
  Typography,
  Upload,
  Popconfirm,
  message,
  Spin,
  Result,
  Breadcrumb,
  Space,
  Tag,
  Tooltip,
  Badge,
  Progress,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  LinkOutlined,
  CopyOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { apiClient } from '../../api/client';
import type { Album, Photo } from '../../types';
import { thumbUrl } from '../../utils/thumb';
import { createLimiter } from '../../utils/limit';

const { Title, Text } = Typography;

// Envoi 3 par 3 : un dossier de 200 photos ne doit pas arriver d'un bloc sur le serveur
const uploadQueue = createLimiter(3);
// Rafraîchit la grille toutes les N photos envoyées, et une fois à la fin
const REFRESH_EVERY = 20;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface SortablePhotoCardProps {
  photo: Photo;
  isCover: boolean;
  onSetCover: (photo: Photo) => void;
  onDelete: (id: string) => void;
  onCopyLink: (token: string) => void;
}

function SortablePhotoCard({ photo, isCover, onSetCover, onDelete, onCopyLink }: SortablePhotoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    border: `2px solid ${isCover ? '#1677ff' : '#f0f0f0'}`,
    borderRadius: 8,
    overflow: 'hidden',
    background: '#fff',
    position: 'relative',
    cursor: 'default',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {isCover && (
        <Tag color="blue" style={{ position: 'absolute', top: 6, left: 6, zIndex: 1, fontSize: 10 }}>
          Couverture
        </Tag>
      )}
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          zIndex: 2,
          cursor: 'grab',
          background: 'rgba(0,0,0,0.45)',
          borderRadius: 4,
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Déplacer"
      >
        <HolderOutlined style={{ color: '#fff', fontSize: 14 }} />
      </div>
      <Image
        src={thumbUrl(photo.id)}
        alt={photo.original_name}
        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
        loading="lazy"
      />
      <div style={{ padding: '8px 10px' }}>
        <Tooltip title={photo.original_name}>
          <Text ellipsis style={{ display: 'block', fontSize: 11, marginBottom: 6 }}>
            {photo.original_name}
          </Text>
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>
          {formatSize(photo.size)}
        </Text>
        <Space size={4}>
          <Tooltip title="Définir comme couverture">
            <Button
              size="small"
              icon={<StarOutlined />}
              type={isCover ? 'primary' : 'default'}
              onClick={() => onSetCover(photo)}
            />
          </Tooltip>
          <Tooltip title="Copier le lien de téléchargement">
            <Button size="small" icon={<CopyOutlined />} onClick={() => onCopyLink(photo.share_token)} />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Popconfirm
              title="Supprimer cette photo ?"
              onConfirm={() => onDelete(photo.id)}
              okText="Supprimer"
              okType="danger"
              cancelText="Annuler"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
}

export function AlbumPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [msg, contextHolder] = message.useMessage();
  const [localPhotos, setLocalPhotos] = useState<Photo[] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: albumData, isLoading: loadingAlbum } = useQuery({
    queryKey: ['admin-album', id],
    queryFn: () => apiClient.get<Album>(`/albums/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: photosData, isLoading: loadingPhotos } = useQuery({
    queryKey: ['admin-album-photos', id],
    queryFn: () => apiClient.get<{ photos: Photo[] }>(`/albums/${id}/photos`).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (photosData?.photos) setLocalPhotos(photosData.photos);
  }, [photosData]);

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => apiClient.delete<void>(`/photos/${photoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-album-photos', id] });
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
      msg.success('Photo supprimée');
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: (photo: Photo) => apiClient.put(`/albums/${photo.album_id}`, { cover_photo_id: photo.filename }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-album', id] });
      msg.success('Photo de couverture définie');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (photoIds: string[]) => apiClient.put('/photos/reorder', { albumId: id, photoIds }),
    onError: () => {
      msg.error("Erreur lors de la sauvegarde de l'ordre");
      setLocalPhotos(photosData?.photos ?? null);
    },
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !localPhotos) return;

      const oldIndex = localPhotos.findIndex((p) => p.id === active.id);
      const newIndex = localPhotos.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(localPhotos, oldIndex, newIndex);
      setLocalPhotos(reordered);
      reorderMutation.mutate(reordered.map((p) => p.id));
    },
    [localPhotos, reorderMutation],
  );

  const batch = useRef({ total: 0, done: 0, failed: 0, skipped: [] as string[] });
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number; skipped: number } | null>(
    null,
  );
  const showProgress = () => {
    const b = batch.current;
    setProgress({ done: b.done, total: b.total, failed: b.failed, skipped: b.skipped.length });
  };

  // Fermer ou recharger l'onglet pendant l'envoi perdrait les photos restantes : le navigateur demande confirmation
  const uploading = progress !== null;
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading]);

  const refreshPhotos = () => {
    qc.invalidateQueries({ queryKey: ['admin-album-photos', id] });
    qc.invalidateQueries({ queryKey: ['admin-albums'] });
  };

  const finishUpload = () => {
    const b = batch.current;
    b.done++;
    if (b.done < b.total) {
      showProgress();
      if (b.done % REFRESH_EVERY === 0) refreshPhotos();
      return;
    }
    refreshPhotos();
    if (b.skipped.length) {
      const label = b.skipped.length > 1 ? 'Fichiers refusés' : 'Fichier refusé';
      msg.warning(`${label} : ${b.skipped.join(', ')}. Formats acceptés : JPEG, PNG, WebP, GIF, HEIC, AVIF, TIFF.`);
    }
    if (b.failed) msg.error(`${b.failed} photo(s) n'ont pas pu être envoyée(s)`);
    batch.current = { total: 0, done: 0, failed: 0, skipped: [] };
    setProgress(null);
  };

  const uploadPhoto = (options: UploadRequestOption) => {
    batch.current.total++;
    showProgress();
    void uploadQueue(async () => {
      const formData = new FormData();
      formData.append('file', options.file as File);
      try {
        const { data } = await apiClient.post<{ skipped?: string[] }>(`/photos/upload/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total && options.onProgress) {
              options.onProgress({ percent: Math.round((e.loaded / e.total) * 100) });
            }
          },
        });
        if (data.skipped?.length) batch.current.skipped.push(...data.skipped);
        options.onSuccess?.({});
      } catch (err) {
        batch.current.failed++;
        options.onError?.(err as Error);
      }
    }).finally(finishUpload);
  };

  const copyShareLink = () => {
    if (!albumData) return;
    const url = `${window.location.origin}/share/${albumData.share_token}`;
    void navigator.clipboard.writeText(url);
    msg.success('Lien copié !');
  };

  const copyPhotoLink = (token: string) => {
    const url = `${window.location.origin}/api/photos/download/${token}`;
    void navigator.clipboard.writeText(url);
    msg.success('Lien copié');
  };

  if (loadingAlbum) return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  if (!albumData) return <Result status="404" title="Album introuvable" />;

  const photos = localPhotos ?? photosData?.photos ?? [];

  return (
    <div>
      {contextHolder}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[{ title: <Link to="/admin/albums">Albums</Link> }, { title: albumData.name }]}
      />

      <Card
        title={
          <Space>
            <Link to="/admin/albums">
              <Button type="text" icon={<ArrowLeftOutlined />} size="small" />
            </Link>
            <Title level={4} style={{ margin: 0 }}>
              {albumData.name}
            </Title>
            <Badge count={photos.length} showZero color="blue" />
          </Space>
        }
        extra={
          <Space>
            <Button icon={<LinkOutlined />} onClick={copyShareLink}>
              Copier le lien
            </Button>
            <Upload multiple accept="image/*" showUploadList={false} customRequest={uploadPhoto}>
              <Button type="primary" icon={<UploadOutlined />}>
                Ajouter des photos
              </Button>
            </Upload>
          </Space>
        }
      >
        {progress && (
          <div
            data-testid="upload-progress"
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              border: '1px solid #91caff',
              borderRadius: 8,
              background: '#e6f4ff',
            }}
          >
            <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
              <Text strong>
                Envoi des photos — {progress.done} / {progress.total}
              </Text>
              <Space size={12}>
                {progress.skipped > 0 && (
                  <Text type="warning">
                    {progress.skipped} fichier{progress.skipped > 1 ? 's' : ''} refusé{progress.skipped > 1 ? 's' : ''}
                  </Text>
                )}
                {progress.failed > 0 && <Text type="danger">{progress.failed} en échec</Text>}
              </Space>
            </Space>
            <Progress percent={Math.floor((progress.done / progress.total) * 100)} status="active" />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Ne fermez pas cette page avant la fin de l'envoi.
            </Text>
          </div>
        )}

        {albumData.description && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {albumData.description}
          </Text>
        )}

        {loadingPhotos ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            <UploadOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
            <p>Aucune photo. Utilisez le bouton ci-dessus pour en ajouter.</p>
          </div>
        ) : (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
              <HolderOutlined /> Glissez les photos pour changer leur ordre d'affichage
            </Text>
            <Image.PreviewGroup>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}
                  >
                    {photos.map((photo) => (
                      <SortablePhotoCard
                        key={photo.id}
                        photo={photo}
                        isCover={albumData.cover_photo_id === photo.filename}
                        onSetCover={(p: Photo) => setCoverMutation.mutate(p)}
                        onDelete={(pid: string) => deleteMutation.mutate(pid)}
                        onCopyLink={copyPhotoLink}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </Image.PreviewGroup>
          </>
        )}
      </Card>
    </div>
  );
}
