import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const SubscriptionScreen = () => {
  const { width } = useWindowDimensions();
  const router = useRouter();

  const isMobile = width < 768;
  const isSmallScreen = width < 1200;
  const isVerySmallScreen = width < 900;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.headerCoral} />

        <View style={styles.content}>
          <Text style={styles.title}>Subscription</Text>
          <Text style={styles.subtitle}>
            Choose the plan that best fits your needs
          </Text>

          <View style={[styles.plansGrid, isMobile && styles.plansStack]}>
            <PlanCard
              title="FREE PLAN"
              description="All core functions, but limited"
              introText="Some limitations:"
              bullets={[
                'Unlimited interactions',
                '10 favorites calendars max.',
                '2 public calendars',
                '2 private calendars',
                'Media and personalisation limitations',
                'Map shows only same day events',
              ]}
              footer="INCLUDES ADS"
              isSmallScreen={isSmallScreen}
              isVerySmallScreen={isVerySmallScreen}
              isMobile={isMobile}
            />

            <PlanCard
              title="STANDARD PACK"
              price="4.99€"
              period="/monthly"
              description="Ideal for users seeking a complete experience"
              introText="All of Free Plan plus:"
              bullets={[
                'Unlimited calendars',
                'Unlimited favorites',
                'Verified Badge',
                'Calendar Personalisation',
                'Full Media additions',
                'Full Map Access',
              ]}
              annualTitle="ANNUAL STANDARD PACK"
              annualPrice="45.99€"
              oldAnnualPrice="59.99€"
              highlight
              isSmallScreen={isSmallScreen}
              isVerySmallScreen={isVerySmallScreen}
              isMobile={isMobile}
            />

            <PlanCard
              title="BUSINESS PACK"
              price="9.99€"
              period="/monthly"
              description="Ideal for influencers and companies that want to grow"
              introText="All of Standard Plan plus:"
              bullets={[
                'Calendar analytics',
                'Promote calendars',
                'Verified Badge',
                'Chat for event goers',
                'Business/Creator Badge',
              ]}
              annualTitle="ANNUAL BUSINESS PACK"
              annualPrice="109.99€"
              oldAnnualPrice="119.99€"
              isSmallScreen={isSmallScreen}
              isVerySmallScreen={isVerySmallScreen}
              isMobile={isMobile}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

type PlanCardProps = {
  title: string;
  description: string;
  bullets: string[];
  footer?: string;
  price?: string;
  period?: string;
  annualTitle?: string;
  annualPrice?: string;
  oldAnnualPrice?: string;
  highlight?: boolean;
  introText: string;
  isSmallScreen: boolean;
  isVerySmallScreen: boolean;
  isMobile: boolean;
};

const PlanCard = ({
  title,
  description,
  bullets,
  footer,
  price,
  period,
  annualTitle,
  annualPrice,
  oldAnnualPrice,
  highlight = false,
  introText,
  isSmallScreen,
  isVerySmallScreen,
  isMobile,
}: PlanCardProps) => {
  const titleSize = isMobile ? 18 : isVerySmallScreen ? 16 : isSmallScreen ? 18 : 22;
  const priceSize = isMobile ? 32 : isVerySmallScreen ? 24 : isSmallScreen ? 28 : 36;
  const textSize = isMobile ? 16 : isVerySmallScreen ? 11 : isSmallScreen ? 12 : 14;
  const descSize = isMobile ? 17 : isVerySmallScreen ? 12 : isSmallScreen ? 13 : 15;
  const annualTitleSize = isMobile ? 17 : isVerySmallScreen ? 13 : isSmallScreen ? 15 : 18;
  const annualPriceSize = isMobile ? 28 : isVerySmallScreen ? 18 : isSmallScreen ? 20 : 24;

  return (
    <View
      style={[
        styles.planWrapper,
        highlight && styles.highlightWrapper,
        isMobile && styles.planWrapperMobile,
      ]}
    >
      <View style={styles.planColumn}>
        <View style={[styles.planCard, isMobile && styles.planCardMobile]}>
          <Text style={[styles.planTitle, { fontSize: titleSize }]}>{title}</Text>

          {price ? (
            <View style={styles.priceRow}>
              <Text style={[styles.price, { fontSize: priceSize }]}>{price}</Text>
              <Text style={[styles.period, { fontSize: textSize }]}>{period}</Text>
            </View>
          ) : null}

          <Text style={[styles.planDescription, { fontSize: descSize }]}>
            {description}
          </Text>

          <Text style={[styles.listIntro, { fontSize: textSize }]}>{introText}</Text>

          <View style={styles.bulletsOuter}>
            <View style={[styles.bulletsContainer, isMobile && styles.bulletsContainerMobile]}>
              {bullets.map((item, index) => (
                <View key={`${title}-${index}`} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { fontSize: textSize + 4 }]}>•</Text>
                  <Text
                    style={[
                      styles.bulletText,
                      { fontSize: textSize, lineHeight: textSize + 8 },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {footer ? (
            <Text style={[styles.footerText, { fontSize: titleSize - 2 }]}>{footer}</Text>
          ) : null}
        </View>

        {annualTitle && annualPrice && (
          <View style={styles.annualCard}>
            <Text style={[styles.annualTitle, { fontSize: annualTitleSize }]}>
              {annualTitle}
            </Text>

            <View style={styles.annualPriceRow}>
              <Text style={[styles.annualPrice, { fontSize: annualPriceSize }]}>
                {annualPrice}
              </Text>
              {oldAnnualPrice ? (
                <Text style={[styles.oldAnnualPrice, { fontSize: annualTitleSize }]}>
                  {oldAnnualPrice}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default SubscriptionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e7e3d3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  headerCoral: {
    height: 34,
    backgroundColor: '#e58a84',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#2f2f2f',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#6e6e6e',
    fontSize: 15,
    marginBottom: 20,
  },
  plansGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 22,
  },
  plansStack: {
    flexDirection: 'column',
    gap: 18,
  },
  planWrapper: {
    width: '31.5%',
    alignSelf: 'stretch',
  },
  planWrapperMobile: {
    width: '100%',
  },
  highlightWrapper: {
    marginTop: 0,
  },
  planColumn: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
  },
  planCard: {
    backgroundColor: '#eeeeee',
    borderWidth: 2,
    borderColor: '#10464d',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    minHeight: 380,
  },
  planCardMobile: {
    minHeight: undefined,
  },
  planTitle: {
    textAlign: 'center',
    color: '#10464d',
    fontWeight: '800',
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  price: {
    fontWeight: '800',
    color: '#0b5d73',
    textShadowColor: 'rgba(11,93,115,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  period: {
    fontWeight: '700',
    color: '#0b5d73',
    marginLeft: 4,
    marginBottom: 5,
  },
  planDescription: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#111111',
    marginBottom: 18,
  },
  listIntro: {
    color: '#111111',
    marginBottom: 8,
    textAlign: 'left',
  },
  bulletsOuter: {
    alignItems: 'center',
  },
  bulletsContainer: {
    width: '82%',
  },
  bulletsContainerMobile: {
    width: '78%',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    width: 18,
    lineHeight: 22,
    color: '#000000',
  },
  bulletText: {
    flex: 1,
    color: '#000000',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '800',
    color: '#10464d',
  },
  annualCard: {
    marginTop: 12,
    backgroundColor: '#eeeeee',
    borderWidth: 2,
    borderColor: '#10464d',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  annualTitle: {
    textAlign: 'center',
    fontWeight: '800',
    color: '#111111',
    marginBottom: 10,
  },
  annualPriceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  annualPrice: {
    fontWeight: '800',
    color: '#0b5d73',
    textShadowColor: 'rgba(11,93,115,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  oldAnnualPrice: {
    fontWeight: '700',
    color: '#666666',
    textDecorationLine: 'line-through',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 6,
    width: '42%',
    backgroundColor: '#e7e3d3',
    borderWidth: 1,
    borderColor: '#10464d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  backButtonText: {
    color: '#10464d',
    fontSize: 16,
    fontWeight: '600',
  },
});