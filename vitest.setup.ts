// Nos testes o PGlite vem do pacote npm. No site, o Worker do banco o carrega de
// public/pglite-<versão>/ e entrega ao motor do mesmo jeito.
import { PGlite } from '@electric-sql/pglite'
import { usarPGlite } from './motor/sessao'

usarPGlite(PGlite)
